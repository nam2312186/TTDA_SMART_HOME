import logging

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from iot_app.broadcast import broadcast_device_status
from iot_app.coreiot_client import CoreIoTClient
from iot_app.coreiot_sync import record_actuator_command
from logs_app.utils import create_activity_log
from users_app.models import User
from building_app.models import RoomManagement

from .models import Device, DeviceType
from .serializers import DeviceSerializer, DeviceTypeSerializer

logger = logging.getLogger('devices_app')


def _resolve_request_user(request):
    raw_uid = request.headers.get('X-User-Id')
    if not raw_uid:
        return None
    try:
        return User.objects.select_related('role_id').filter(pk=int(raw_uid)).first()
    except (TypeError, ValueError):
        return None


def _is_admin(user):
    return bool(user and user.role_id and user.role_id.role_name == 'admin')


def _require_authenticated(request):
    user = _resolve_request_user(request)
    if not user:
        return None, Response({'error': 'X-User-Id is required'}, status=status.HTTP_401_UNAUTHORIZED)
    return user, None


def _require_admin(request):
    user, error = _require_authenticated(request)
    if error:
        return None, error
    if not _is_admin(user):
        return None, Response({'error': 'Only admin can modify devices'}, status=status.HTTP_403_FORBIDDEN)
    return user, None


def _can_access_device(user, device):
    if _is_admin(user):
        return True
    return RoomManagement.objects.filter(user=user, room_id=device.room_id).exists()


def _resolve_light_channel(device_id: int) -> dict:
    light2_id = str(getattr(settings, 'COREIOT_LOCAL_LIGHT_ACTUATOR_2_ID', '') or '').strip()
    if light2_id and str(device_id) == light2_id:
        return {
            'method': getattr(settings, 'COREIOT_SETSTATE_METHOD_2', 'setState2'),
            'direct_key': getattr(settings, 'COREIOT_BRIGHTNESS_2_KEY', 'brightness_2'),
        }
    return {
        'method': getattr(settings, 'COREIOT_SETSTATE_METHOD', 'setState'),
        'direct_key': getattr(settings, 'COREIOT_BRIGHTNESS_KEY', 'brightness'),
    }


def _resolve_fan_channel(device_id: int) -> dict:
    fan2_id = str(getattr(settings, 'COREIOT_LOCAL_FAN_ACTUATOR_2_ID', '') or '').strip()
    if fan2_id and str(device_id) == fan2_id:
        return {
            'method': getattr(settings, 'COREIOT_SETSTATE_VALUE_METHOD_2', 'setValue2'),
            'direct_key': getattr(settings, 'COREIOT_FAN_SPEED_2_KEY', 'fan_speed_2'),
        }
    return {
        'method': getattr(settings, 'COREIOT_SETSTATE_VALUE_METHOD', 'setValue'),
        'direct_key': getattr(settings, 'COREIOT_FAN_SPEED_KEY', 'fan_speed'),
    }


class DeviceTypeListView(APIView):
    def get(self, request):
        types = DeviceType.objects.all()
        return Response(DeviceTypeSerializer(types, many=True).data)

    def post(self, request):
        serializer = DeviceTypeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeviceListView(APIView):
    def get(self, request):
        user, error = _require_authenticated(request)
        if error:
            return error

        devices = Device.objects.select_related('room', 'room__floor', 'type', 'threshold').all()
        if not _is_admin(user):
            allowed_room_ids = RoomManagement.objects.filter(user=user).values_list('room_id', flat=True)
            devices = devices.filter(room_id__in=allowed_room_ids)

        serializer = DeviceSerializer(devices, many=True)
        return Response(serializer.data)

    def post(self, request):
        _, error = _require_admin(request)
        if error:
            return error
        serializer = DeviceSerializer(data=request.data)
        if serializer.is_valid():
            device = serializer.save()
            create_activity_log(
                request=request,
                device=device,
                action='device_created',
                details=f'Created device "{device.device_name}" in room {device.room.room_name}',
            )
            return Response(DeviceSerializer(device).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeviceDetailView(APIView):
    def get(self, request, pk):
        user, error = _require_authenticated(request)
        if error:
            return error
        device = get_object_or_404(Device.objects.select_related('room', 'room__floor', 'type', 'threshold'), pk=pk)
        if not _can_access_device(user, device):
            return Response({'error': 'Permission denied for this device'}, status=status.HTTP_403_FORBIDDEN)
        serializer = DeviceSerializer(device)
        return Response(serializer.data)

    def put(self, request, pk):
        _, error = _require_admin(request)
        if error:
            return error
        device = get_object_or_404(Device, pk=pk)
        old_name = device.device_name
        serializer = DeviceSerializer(device, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            create_activity_log(
                request=request,
                device=updated,
                action='device_updated',
                details=f'Updated device "{old_name}" -> "{updated.device_name}"',
            )
            return Response(DeviceSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        _, error = _require_admin(request)
        if error:
            return error
        device = get_object_or_404(Device, pk=pk)
        device_name = device.device_name
        room_name = device.room.room_name if device.room else 'N/A'
        create_activity_log(
            request=request,
            device=device,
            action='device_deleted',
            details=f'Deleted device "{device_name}" from room {room_name}',
        )
        device.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoomDeviceListView(APIView):
    def get(self, request, room_id):
        user, error = _require_authenticated(request)
        if error:
            return error

        if not _is_admin(user) and not RoomManagement.objects.filter(user=user, room_id=room_id).exists():
            return Response({'error': 'Permission denied for this room'}, status=status.HTTP_403_FORBIDDEN)

        devices = Device.objects.select_related('room', 'room__floor', 'type', 'threshold').filter(room_id=room_id)
        serializer = DeviceSerializer(devices, many=True)
        return Response(serializer.data)


class DeviceTurnOnView(APIView):
    def post(self, request, pk):
        user, error = _require_authenticated(request)
        if error:
            return error
        device = get_object_or_404(Device, pk=pk)
        if not _can_access_device(user, device):
            return Response({'error': 'Permission denied for this device'}, status=status.HTTP_403_FORBIDDEN)

        device_type = getattr(device.type, 'name_type', '')
        if device_type in ('light', 'fan') and getattr(settings, 'COREIOT_ENABLED', False):
            coreiot_device_id = getattr(settings, 'COREIOT_DEVICE_ID', '').strip()
            if not coreiot_device_id:
                return Response(
                    {'error': 'Missing COREIOT_DEVICE_ID. Cannot sync turn on to CoreIoT.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            publish_value = int(device.brightness) if int(device.brightness or 0) > 0 else 100
            client = CoreIoTClient()
            channel = _resolve_light_channel(device.device_id) if device_type == 'light' else _resolve_fan_channel(device.device_id)
            try:
                ok = (
                    client.set_brightness(
                        coreiot_device_id,
                        publish_value,
                        method_name=channel['method'],
                        direct_key=channel['direct_key'],
                    )
                    if device_type == 'light'
                    else client.set_value(
                        coreiot_device_id,
                        publish_value,
                        method_name=channel['method'],
                        direct_key=channel['direct_key'],
                    )
                )
            except Exception as e:
                logger.error(f'CoreIoT turn on sync error: {e}')
                ok = False

            if not ok:
                return Response(
                    {'error': 'Failed to sync turn on to CoreIoT. Local state was not updated.'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            record_actuator_command(device.device_id)
            device.brightness = publish_value

        device.status = True
        device.save(update_fields=['status', 'brightness'])
        create_activity_log(
            request=request,
            device=device,
            action='device_turned_on',
            details=f'Turned on "{device.device_name}"',
        )
        # ✅ Always include current brightness to prevent FE from resetting it
        broadcast_device_status(device.device_id, True, device.device_name, device.brightness)
        return Response({'message': f'{device.device_name} turned on', 'status': True})


class DeviceTurnOffView(APIView):
    def post(self, request, pk):
        user, error = _require_authenticated(request)
        if error:
            return error
        device = get_object_or_404(Device, pk=pk)
        if not _can_access_device(user, device):
            return Response({'error': 'Permission denied for this device'}, status=status.HTTP_403_FORBIDDEN)

        device_type = getattr(device.type, 'name_type', '')
        if device_type in ('light', 'fan') and getattr(settings, 'COREIOT_ENABLED', False):
            coreiot_device_id = getattr(settings, 'COREIOT_DEVICE_ID', '').strip()
            if not coreiot_device_id:
                return Response(
                    {'error': 'Missing COREIOT_DEVICE_ID. Cannot sync turn off to CoreIoT.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            client = CoreIoTClient()
            channel = _resolve_light_channel(device.device_id) if device_type == 'light' else _resolve_fan_channel(device.device_id)
            try:
                ok = (
                    client.set_brightness(
                        coreiot_device_id,
                        0,
                        method_name=channel['method'],
                        direct_key=channel['direct_key'],
                    )
                    if device_type == 'light'
                    else client.set_value(
                        coreiot_device_id,
                        0,
                        method_name=channel['method'],
                        direct_key=channel['direct_key'],
                    )
                )
            except Exception as e:
                logger.error(f'CoreIoT turn off sync error: {e}')
                ok = False

            if not ok:
                return Response(
                    {'error': 'Failed to sync turn off to CoreIoT. Local state was not updated.'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            record_actuator_command(device.device_id)

        device.status = False
        device.save(update_fields=['status'])
        create_activity_log(
            request=request,
            device=device,
            action='device_turned_off',
            details=f'Turned off "{device.device_name}"',
        )
        # ✅ Always include current brightness to prevent FE from resetting it
        broadcast_device_status(device.device_id, False, device.device_name, device.brightness)
        return Response({'message': f'{device.device_name} turned off', 'status': False})


class DeviceToggleView(APIView):
    def post(self, request, pk):
        user, error = _require_authenticated(request)
        if error:
            return error
        device = get_object_or_404(Device, pk=pk)
        if not _can_access_device(user, device):
            return Response({'error': 'Permission denied for this device'}, status=status.HTTP_403_FORBIDDEN)

        next_status = not device.status
        device_type = getattr(device.type, 'name_type', '')
        if device_type in ('light', 'fan') and getattr(settings, 'COREIOT_ENABLED', False):
            coreiot_device_id = getattr(settings, 'COREIOT_DEVICE_ID', '').strip()
            if not coreiot_device_id:
                return Response(
                    {'error': 'Missing COREIOT_DEVICE_ID. Cannot sync toggle to CoreIoT.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            publish_value = 0
            if next_status:
                publish_value = int(device.brightness) if int(device.brightness or 0) > 0 else 100

            client = CoreIoTClient()
            channel = _resolve_light_channel(device.device_id) if device_type == 'light' else _resolve_fan_channel(device.device_id)
            try:
                ok = (
                    client.set_brightness(
                        coreiot_device_id,
                        publish_value,
                        method_name=channel['method'],
                        direct_key=channel['direct_key'],
                    )
                    if device_type == 'light'
                    else client.set_value(
                        coreiot_device_id,
                        publish_value,
                        method_name=channel['method'],
                        direct_key=channel['direct_key'],
                    )
                )
            except Exception as e:
                logger.error(f'CoreIoT toggle sync error: {e}')
                ok = False

            if not ok:
                return Response(
                    {'error': 'Failed to sync toggle to CoreIoT. Local state was not updated.'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            record_actuator_command(device.device_id)

            if next_status:
                device.brightness = publish_value

        device.status = next_status
        device.save(update_fields=['status', 'brightness'])
        action = 'device_turned_on' if device.status else 'device_turned_off'
        create_activity_log(
            request=request,
            device=device,
            action=action,
            details=f'Toggled "{device.device_name}" -> {device.status}',
        )
        # ✅ Always include current brightness to prevent FE from resetting it
        broadcast_device_status(device.device_id, device.status, device.device_name, device.brightness)
        return Response({'message': f'{device.device_name} toggled', 'status': device.status})


class DeviceBrightnessView(APIView):
    def post(self, request, pk):
        user, error = _require_authenticated(request)
        if error:
            return error
        device = get_object_or_404(Device, pk=pk)
        if not _can_access_device(user, device):
            return Response({'error': 'Permission denied for this device'}, status=status.HTTP_403_FORBIDDEN)
        
        if device.type.name_type != 'light':
            return Response(
                {'error': 'This endpoint is for light devices only'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        brightness = request.data.get('brightness', 0)
        
        try:
            brightness = int(brightness)
            # ✅ Validate: only accept 0-100%
            if brightness < 0 or brightness > 100:
                return Response(
                    {'error': f'Brightness must be 0-100%, got {brightness}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response({'error': 'Invalid brightness value'}, status=status.HTTP_400_BAD_REQUEST)

        # Publish 0-100 directly so firmware can map to PWM itself.
        publish_value = brightness

        # Brightness control must be synchronized via CoreIoT, not local-only command flow.
        if not getattr(settings, 'COREIOT_ENABLED', False):
            return Response(
                {'error': 'CoreIoT control is disabled. Brightness sync requires CoreIoT.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        coreiot_device_id = getattr(settings, 'COREIOT_DEVICE_ID', '').strip()
        if not coreiot_device_id:
            return Response(
                {'error': 'Missing COREIOT_DEVICE_ID. Cannot send brightness to CoreIoT.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            logger.info(f'⚡ Publishing brightness to CoreIoT: device_id={coreiot_device_id}, value={publish_value}%')
            light_channel = _resolve_light_channel(device.device_id)
            ok = CoreIoTClient().set_brightness(
                coreiot_device_id,
                publish_value,
                method_name=light_channel['method'],
                direct_key=light_channel['direct_key'],
            )
        except Exception as e:
            logger.error(f'CoreIoT setState error: {e}')
            ok = False

        if not ok:
            logger.warning('CoreIoT setState did not return success')
            return Response(
                {'error': 'Failed to sync brightness to CoreIoT. Local state was not updated.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        
        record_actuator_command(device.device_id)
        is_on = publish_value > 0
        device.brightness = publish_value
        device.status = is_on
        device.save(update_fields=['brightness', 'status'])
        
        create_activity_log(
            request=request,
            device=device,
            action='device_brightness_set',
            details=f'Device "{device.device_name}" brightness set to {brightness}%',
        )

        broadcast_device_status(device.device_id, is_on, device.device_name, brightness)
        
        return Response({
            'message': f'{device.device_name} brightness set to {brightness}%',
            'brightness': publish_value,
            'status': is_on,
        })


class DeviceFanSpeedView(APIView):
    def post(self, request, pk):
        user, error = _require_authenticated(request)
        if error:
            return error
        device = get_object_or_404(Device, pk=pk)
        if not _can_access_device(user, device):
            return Response({'error': 'Permission denied for this device'}, status=status.HTTP_403_FORBIDDEN)
        
        if device.type.name_type != 'fan':
            return Response(
                {'error': 'This endpoint is for fan devices only'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        speed = request.data.get('speed', 0)
        
        try:
            speed = int(speed)
            # ✅ Validate: only accept 0-100%
            if speed < 0 or speed > 100:
                return Response(
                    {'error': f'Fan speed must be 0-100%, got {speed}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response({'error': 'Invalid fan speed value'}, status=status.HTTP_400_BAD_REQUEST)

        # Publish 0-100 directly so firmware can map to PWM itself.
        publish_value = speed

        if not getattr(settings, 'COREIOT_ENABLED', False):
            return Response(
                {'error': 'CoreIoT control is disabled. Fan speed sync requires CoreIoT.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        coreiot_fan_device_id = getattr(settings, 'COREIOT_DEVICE_ID', '').strip()
        if not coreiot_fan_device_id:
            return Response(
                {'error': 'Missing COREIOT_DEVICE_ID. Cannot send speed to CoreIoT.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            logger.info(f'⚡ Publishing fan speed to CoreIoT: device_id={coreiot_fan_device_id}, value={publish_value}%')
            fan_channel = _resolve_fan_channel(device.device_id)
            ok = CoreIoTClient().set_value(
                coreiot_fan_device_id,
                publish_value,
                method_name=fan_channel['method'],
                direct_key=fan_channel['direct_key'],
            )
        except Exception as e:
            logger.error(f'CoreIoT setValue error: {e}')
            ok = False

        if not ok:
            logger.warning('CoreIoT setValue did not return success')
            return Response(
                {'error': 'Failed to sync fan speed to CoreIoT. Local state was not updated.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        
        record_actuator_command(device.device_id)
        is_on = publish_value > 0
        device.brightness = publish_value  # Store 0-100 directly
        device.status = is_on
        device.save(update_fields=['brightness', 'status'])
        
        create_activity_log(
            request=request,
            device=device,
            action='device_fan_speed_set',
            details=f'Device "{device.device_name}" fan speed set to {speed}%',
        )

        broadcast_device_status(device.device_id, is_on, device.device_name, speed)
        
        return Response({
            'message': f'{device.device_name} fan speed set to {speed}%',
            'speed': publish_value,
            'status': is_on,
        })

