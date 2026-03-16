from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from devices_app.models import Sensor
from iot_app.broadcast import broadcast_alert, broadcast_sensor_update
from logs_app.models import ActivityLog
from logs_app.utils import create_activity_log

from .models import Alert, SensorData, Threshold
from .serializers import AlertSerializer, SensorDataSerializer, ThresholdSerializer


def _check_threshold(entry, source='system'):
    threshold = Threshold.objects.filter(sensor=entry.sensor).first()
    if threshold is None:
        return None

    value = entry.value
    direction = None
    threshold_value = None

    if threshold.max_value is not None and value > threshold.max_value:
        direction = Alert.DIRECTION_HIGH
        threshold_value = threshold.max_value
    elif threshold.min_value is not None and value < threshold.min_value:
        direction = Alert.DIRECTION_LOW
        threshold_value = threshold.min_value

    if direction is None:
        return None

    device = entry.sensor.device
    message = (
        f'{device.device_name} ({entry.sensor.sensor_type}) '
        f'ghi nhận {value}{entry.unit or ""} '
        f'{"cao hơn" if direction == Alert.DIRECTION_HIGH else "thấp hơn"} '
        f'ngưỡng {threshold_value}{entry.unit or ""}'
    )
    alert = Alert.objects.create(
        sensor=entry.sensor,
        message=message,
    )
    create_activity_log(
        device=device,
        action='threshold_alert_created',
        details=message,
    )
    broadcast_alert(alert.alert_id, entry.sensor_id, message, device.device_id)
    return alert


class SensorDataListView(APIView):
    def get(self, request):
        sensor_id = request.query_params.get('sensor')
        data = SensorData.objects.select_related('sensor', 'sensor__device', 'sensor__device__room', 'sensor__device__room__floor').all()
        if sensor_id:
            data = data.filter(sensor_id=sensor_id)
        serializer = SensorDataSerializer(data, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SensorDataSerializer(data=request.data)
        if serializer.is_valid():
            entry = serializer.save()
            _check_threshold(entry)
            device = entry.sensor.device
            broadcast_sensor_update(entry.sensor_id, entry.value, entry.unit or '', device.device_id, entry.sensor.sensor_type)
            return Response(SensorDataSerializer(entry).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SensorDataLatestView(APIView):
    def get(self, request):
        latest = []
        sensors = Sensor.objects.select_related('device').all()
        for sensor in sensors:
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


class ThresholdListView(APIView):
    def get(self, request):
        thresholds = Threshold.objects.select_related('sensor', 'sensor__device').all()
        serializer = ThresholdSerializer(thresholds, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ThresholdSerializer(data=request.data)
        if serializer.is_valid():
            threshold = serializer.save()
            return Response(ThresholdSerializer(threshold).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ThresholdDetailView(APIView):
    def put(self, request, pk):
        threshold = get_object_or_404(Threshold, pk=pk)
        serializer = ThresholdSerializer(threshold, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        threshold = get_object_or_404(Threshold, pk=pk)
        threshold.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AlertListView(APIView):
    def get(self, request):
        alerts = Alert.objects.select_related('sensor', 'sensor__device', 'sensor__device__room', 'sensor__device__room__floor').all()
        serializer = AlertSerializer(alerts, many=True)
        return Response(serializer.data)


class AlertUnreadListView(APIView):
    def get(self, request):
        alerts = Alert.objects.select_related('sensor', 'sensor__device', 'sensor__device__room', 'sensor__device__room__floor').filter(is_read=False)
        serializer = AlertSerializer(alerts, many=True)
        return Response(serializer.data)


class AlertDetailView(APIView):
    def get(self, request, pk):
        alert = get_object_or_404(Alert.objects.select_related('sensor', 'sensor__device', 'sensor__device__room', 'sensor__device__room__floor'), pk=pk)
        serializer = AlertSerializer(alert)
        return Response(serializer.data)

    def delete(self, request, pk):
        alert = get_object_or_404(Alert, pk=pk)
        alert.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AlertMarkReadView(APIView):
    def post(self, request, pk):
        alert = get_object_or_404(Alert, pk=pk)
        alert.is_read = True
        alert.save(update_fields=['is_read'])
        return Response({'message': 'Alert marked as read', 'is_read': True})