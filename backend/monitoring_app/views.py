from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import SensorData, Threshold, Alert
from .serializers import SensorDataSerializer, ThresholdSerializer, AlertSerializer


# ── Helper: tự động tạo Alert khi vượt ngưỡng ────────────────────────────────

def _check_threshold(entry):
    """Kiểm tra ngưỡng sau khi nhận sensor data, tạo Alert nếu vượt."""
    try:
        threshold = entry.sensor.threshold
    except Exception:
        return

    value = entry.value
    message = None

    if threshold.max_value is not None and value > threshold.max_value:
        message = (
            f"{entry.sensor.device.device_name} vượt ngưỡng tối đa: "
            f"{value} > {threshold.max_value} {entry.unit or ''}"
        )
    elif threshold.min_value is not None and value < threshold.min_value:
        message = (
            f"{entry.sensor.device.device_name} dưới ngưỡng tối thiểu: "
            f"{value} < {threshold.min_value} {entry.unit or ''}"
        )

    if message:
        Alert.objects.create(
            sensor=entry.sensor,
            message=message,
        )


# ── Sensor Data ───────────────────────────────────────────────────────────────

class SensorDataListView(APIView):
    def get(self, request):
        data = SensorData.objects.all()
        serializer = SensorDataSerializer(data, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SensorDataSerializer(data=request.data)
        if serializer.is_valid():
            entry = serializer.save()
            _check_threshold(entry)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SensorDataLatestView(APIView):
    """Trả về bản ghi mới nhất của mỗi sensor."""
    def get(self, request):
        from devices_app.models import Sensor
        latest = []
        for sensor in Sensor.objects.all():
            entry = SensorData.objects.filter(sensor=sensor).first()
            if entry:
                latest.append(entry)
        serializer = SensorDataSerializer(latest, many=True)
        return Response(serializer.data)


class SensorDataBySensorView(APIView):
    def get(self, request, sensor_id):
        data = SensorData.objects.filter(sensor_id=sensor_id)
        serializer = SensorDataSerializer(data, many=True)
        return Response(serializer.data)


# ── Thresholds ────────────────────────────────────────────────────────────────

class ThresholdListView(APIView):
    def get(self, request):
        thresholds = Threshold.objects.all()
        serializer = ThresholdSerializer(thresholds, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ThresholdSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ThresholdDetailView(APIView):
    def put(self, request, pk):
        threshold = get_object_or_404(Threshold, pk=pk)
        serializer = ThresholdSerializer(threshold, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        threshold = get_object_or_404(Threshold, pk=pk)
        threshold.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Alerts ────────────────────────────────────────────────────────────────────

class AlertListView(APIView):
    def get(self, request):
        alerts = Alert.objects.all()
        serializer = AlertSerializer(alerts, many=True)
        return Response(serializer.data)


class AlertDetailView(APIView):
    def get(self, request, pk):
        alert = get_object_or_404(Alert, pk=pk)
        serializer = AlertSerializer(alert)
        return Response(serializer.data)

    def delete(self, request, pk):
        alert = get_object_or_404(Alert, pk=pk)
        alert.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AlertMarkReadView(APIView):
    def put(self, request, pk):
        alert = get_object_or_404(Alert, pk=pk)
        alert.is_read = True
        alert.save()
        return Response({"message": "Alert marked as read", "is_read": True})
