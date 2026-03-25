from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from iot_app.broadcast import broadcast_device_status
from iot_app.mqtt_client import create_mqtt_client, publish_device_control
from logs_app.utils import create_activity_log

from .models import Device, DeviceType
from .serializers import DeviceSerializer, DeviceTypeSerializer


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
        brightness = request.data.get('brightness', 0)
        
        try:
            brightness = max(0, min(255, int(brightness)))
        except (ValueError, TypeError):
            return Response({'error': 'Invalid brightness value'}, status=status.HTTP_400_BAD_REQUEST)
        
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
        
        # Publish to MQTT broker
        try:
            mqtt_client, broker, port = create_mqtt_client()
            mqtt_client.connect(broker, port, keepalive=60)
            mqtt_client.loop_start()
            publish_device_control(mqtt_client, device.device_id, brightness)
            mqtt_client.loop_stop()
            mqtt_client.disconnect()
        except Exception as e:
            # Log error but still return success since DB was updated
            import logging
            logging.getLogger('devices_app').error(f'MQTT publish error: {e}')

        broadcast_device_status(device.device_id, is_on, device.device_name)
        
        return Response({
            'message': f'{device.device_name} brightness set to {brightness}/255',
            'brightness': brightness,
            'status': is_on,
        })

