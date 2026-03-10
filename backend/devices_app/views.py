from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import Device, Sensor
from .serializers import DeviceSerializer, SensorSerializer


# ── Devices ──────────────────────────────────────────────────────────────────

class DeviceListView(APIView):
    def get(self, request):
        devices = Device.objects.all()
        serializer = DeviceSerializer(devices, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = DeviceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeviceDetailView(APIView):
    def get(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        serializer = DeviceSerializer(device)
        return Response(serializer.data)

    def put(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        serializer = DeviceSerializer(device, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        device.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoomDeviceListView(APIView):
    def get(self, request, room_id):
        devices = Device.objects.filter(room_id=room_id)
        serializer = DeviceSerializer(devices, many=True)
        return Response(serializer.data)


# ── Device Control ────────────────────────────────────────────────────────────

class DeviceTurnOnView(APIView):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        device.status = True
        device.save()
        return Response({"message": f"{device.device_name} turned on", "status": True})


class DeviceTurnOffView(APIView):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        device.status = False
        device.save()
        return Response({"message": f"{device.device_name} turned off", "status": False})


class DeviceToggleView(APIView):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        device.status = not device.status
        device.save()
        return Response({"message": f"{device.device_name} toggled", "status": device.status})


# ── Sensors ───────────────────────────────────────────────────────────────────

class SensorListView(APIView):
    def get(self, request):
        sensors = Sensor.objects.all()
        serializer = SensorSerializer(sensors, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SensorSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SensorDetailView(APIView):
    def get(self, request, pk):
        sensor = get_object_or_404(Sensor, pk=pk)
        serializer = SensorSerializer(sensor)
        return Response(serializer.data)

    def delete(self, request, pk):
        sensor = get_object_or_404(Sensor, pk=pk)
        sensor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
