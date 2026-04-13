import logging

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from iot_app.broadcast import broadcast_device_status
from iot_app.coreiot_client import CoreIoTClient
from logs_app.utils import create_activity_log

from .models import Device, DeviceType
from .serializers import DeviceSerializer, DeviceTypeSerializer

logger = logging.getLogger('devices_app')


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
        devices = Device.objects.select_related('room', 'room__floor', 'type', 'threshold').all()
        serializer = DeviceSerializer(devices, many=True)
        return Response(serializer.data)

    def post(self, request):
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
        device = get_object_or_404(Device.objects.select_related('room', 'room__floor', 'type', 'threshold'), pk=pk)
        serializer = DeviceSerializer(device)
        return Response(serializer.data)

    def put(self, request, pk):
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
        devices = Device.objects.select_related('room', 'room__floor', 'type', 'threshold').filter(room_id=room_id)
        serializer = DeviceSerializer(devices, many=True)
        return Response(serializer.data)


class DeviceTurnOnView(APIView):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        device.status = True
        device.save(update_fields=['status'])
        create_activity_log(
            request=request,
            device=device,
            action='device_turned_on',
            details=f'Turned on "{device.device_name}"',
        )
        broadcast_device_status(device.device_id, True, device.device_name)
        return Response({'message': f'{device.device_name} turned on', 'status': True})


class DeviceTurnOffView(APIView):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        device.status = False
        device.save(update_fields=['status'])
        create_activity_log(
            request=request,
            device=device,
            action='device_turned_off',
            details=f'Turned off "{device.device_name}"',
        )
        broadcast_device_status(device.device_id, False, device.device_name)
        return Response({'message': f'{device.device_name} turned off', 'status': False})


class DeviceToggleView(APIView):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        device.status = not device.status
        device.save(update_fields=['status'])
        action = 'device_turned_on' if device.status else 'device_turned_off'
        create_activity_log(
            request=request,
            device=device,
            action=action,
            details=f'Toggled "{device.device_name}" -> {device.status}',
        )
        broadcast_device_status(device.device_id, device.status, device.device_name)
        return Response({'message': f'{device.device_name} toggled', 'status': device.status})


class DeviceBrightnessView(APIView):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        
        if device.type.name_type != 'light':
            return Response(
                {'error': 'This endpoint is for light devices only'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        brightness = request.data.get('brightness', 0)
        
        try:
            brightness = max(0, min(255, int(brightness)))
        except (ValueError, TypeError):
            return Response({'error': 'Invalid brightness value'}, status=status.HTTP_400_BAD_REQUEST)

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
            ok = CoreIoTClient().set_brightness(coreiot_device_id, brightness)
        except Exception as e:
            logger.error(f'CoreIoT setState error: {e}')
            ok = False

        if not ok:
            logger.warning('CoreIoT setState did not return success')
            return Response(
                {'error': 'Failed to sync brightness to CoreIoT. Local state was not updated.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        
        is_on = brightness > 0
        device.brightness = brightness
        device.status = is_on
        device.save(update_fields=['brightness', 'status'])
        
        create_activity_log(
            request=request,
            device=device,
            action='device_brightness_set',
            details=f'Device "{device.device_name}" brightness set to {brightness}/255',
        )

        broadcast_device_status(device.device_id, is_on, device.device_name, brightness)
        
        return Response({
            'message': f'{device.device_name} brightness set to {brightness}/255',
            'brightness': brightness,
            'status': is_on,
        })


class DeviceFanSpeedView(APIView):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        
        if device.type.name_type != 'fan':
            return Response(
                {'error': 'This endpoint is for fan devices only'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        speed = request.data.get('speed', 0)
        
        try:
            speed = max(0, min(255, int(speed)))
        except (ValueError, TypeError):
            return Response({'error': 'Invalid fan speed value'}, status=status.HTTP_400_BAD_REQUEST)

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
            ok = CoreIoTClient().set_value(coreiot_fan_device_id, speed)
        except Exception as e:
            logger.error(f'CoreIoT setValue error: {e}')
            ok = False

        if not ok:
            logger.warning('CoreIoT setValue did not return success')
            return Response(
                {'error': 'Failed to sync fan speed to CoreIoT. Local state was not updated.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        
        is_on = speed > 0
        device.brightness = speed  # Dùng field brightness cho speed
        device.status = is_on
        device.save(update_fields=['brightness', 'status'])
        
        create_activity_log(
            request=request,
            device=device,
            action='device_fan_speed_set',
            details=f'Device "{device.device_name}" fan speed set to {speed}/255',
        )

        broadcast_device_status(device.device_id, is_on, device.device_name, speed)
        
        return Response({
            'message': f'{device.device_name} fan speed set to {speed}/255',
            'speed': speed,
            'status': is_on,
        })

