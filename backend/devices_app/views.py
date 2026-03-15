from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from iot_app.broadcast import broadcast_device_status
from logs_app.utils import create_activity_log

from .models import Device
from .serializers import DeviceSerializer


class DeviceListView(APIView):
    def get(self, request):
        devices = Device.objects.select_related('room', 'room__floor', 'threshold__target_device').all()
        serializer = DeviceSerializer(devices, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = DeviceSerializer(data=request.data)
        if serializer.is_valid():
            device = serializer.save()
            create_activity_log(
                request=request,
                device=device,
                category='device',
                action='device_created',
                details=f'Tạo thiết bị "{device.device_name}" ({device.device_type}/{device.device_subtype}) trong phòng {device.room.room_name}',
                metadata={
                    'device_type': device.device_type,
                    'device_subtype': device.device_subtype,
                    'room_id': device.room_id,
                },
            )
            return Response(DeviceSerializer(device).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeviceDetailView(APIView):
    def get(self, request, pk):
        device = get_object_or_404(Device.objects.select_related('room', 'room__floor', 'threshold__target_device'), pk=pk)
        serializer = DeviceSerializer(device)
        return Response(serializer.data)

    def put(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        old_name = device.device_name
        old_status = device.status
        old_room_id = device.room_id
        serializer = DeviceSerializer(device, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            create_activity_log(
                request=request,
                device=updated,
                category='device',
                action='device_updated',
                details=f'Cập nhật thiết bị "{old_name}" → "{updated.device_name}"',
                metadata={
                    'old_status': old_status,
                    'new_status': updated.status,
                    'old_room_id': old_room_id,
                    'new_room_id': updated.room_id,
                    'device_type': updated.device_type,
                    'device_subtype': updated.device_subtype,
                    'threshold': DeviceSerializer(updated).data.get('threshold'),
                },
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
            category='device',
            action='device_deleted',
            details=f'Xóa thiết bị "{device_name}" khỏi phòng {room_name}',
            metadata={'room_id': device.room_id, 'device_type': device.device_type},
        )
        device.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoomDeviceListView(APIView):
    def get(self, request, room_id):
        devices = Device.objects.select_related('room', 'room__floor', 'threshold__target_device').filter(room_id=room_id)
        serializer = DeviceSerializer(devices, many=True)
        return Response(serializer.data)


class DeviceTurnOnView(APIView):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        device.status = True
        device.save(update_fields=['status', 'updated_at'])
        create_activity_log(
            request=request,
            device=device,
            category='device',
            action='device_turned_on',
            details=f'Bật thiết bị "{device.device_name}"',
            metadata={'status': True},
        )
        broadcast_device_status(device.device_id, True, device.device_name)
        return Response({'message': f'{device.device_name} turned on', 'status': True})


class DeviceTurnOffView(APIView):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        device.status = False
        device.save(update_fields=['status', 'updated_at'])
        create_activity_log(
            request=request,
            device=device,
            category='device',
            action='device_turned_off',
            details=f'Tắt thiết bị "{device.device_name}"',
            metadata={'status': False},
        )
        broadcast_device_status(device.device_id, False, device.device_name)
        return Response({'message': f'{device.device_name} turned off', 'status': False})


class DeviceToggleView(APIView):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        device.status = not device.status
        device.save(update_fields=['status', 'updated_at'])
        create_activity_log(
            request=request,
            device=device,
            category='device',
            action='device_toggled',
            details=f'Đảo trạng thái thiết bị "{device.device_name}" → {"on" if device.status else "off"}',
            metadata={'status': device.status},
        )
        broadcast_device_status(device.device_id, device.status, device.device_name)
        return Response({'message': f'{device.device_name} toggled', 'status': device.status})


class SensorListView(APIView):
    def get(self, request):
        devices = Device.objects.filter(device_type=Device.TYPE_SENSOR)
        serializer = DeviceSerializer(devices, many=True)
        return Response(serializer.data)

    def post(self, request):
        payload = {**request.data, 'device_type': Device.TYPE_SENSOR}
        serializer = DeviceSerializer(data=payload)
        if serializer.is_valid():
            device = serializer.save()
            return Response(DeviceSerializer(device).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SensorDetailView(APIView):
    def get(self, request, pk):
        sensor = get_object_or_404(Device, pk=pk, device_type=Device.TYPE_SENSOR)
        return Response(DeviceSerializer(sensor).data)

    def delete(self, request, pk):
        sensor = get_object_or_404(Device, pk=pk, device_type=Device.TYPE_SENSOR)
        sensor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)