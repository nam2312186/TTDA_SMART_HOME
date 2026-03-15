from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from devices_app.models import Device
from iot_app.broadcast import broadcast_alert, broadcast_sensor_update
from logs_app.models import ActivityLog
from logs_app.utils import create_activity_log

from .models import Alert, SensorData, Threshold
from .serializers import AlertSerializer, SensorDataSerializer, ThresholdSerializer


def _apply_threshold_action(threshold, source='system'):
    target_device = threshold.target_device or threshold.device
    if threshold.trigger_action == Threshold.ACTION_NONE or not target_device:
        return None

    if threshold.trigger_action == Threshold.ACTION_TURN_ON:
        target_device.status = True
    elif threshold.trigger_action == Threshold.ACTION_TURN_OFF:
        target_device.status = False
    elif threshold.trigger_action == Threshold.ACTION_TOGGLE:
        target_device.status = not target_device.status
    else:
        return None

    target_device.save(update_fields=['status', 'updated_at'])
    create_activity_log(
        device=target_device,
        source=ActivityLog.SOURCE_SYSTEM if source == 'system' else ActivityLog.SOURCE_DEVICE,
        category='automation',
        action='threshold_action_executed',
        details=f'Tự động {threshold.trigger_action} thiết bị "{target_device.device_name}" do vượt ngưỡng của "{threshold.device.device_name}"',
        metadata={
            'trigger_device_id': threshold.device_id,
            'target_device_id': target_device.device_id,
            'trigger_action': threshold.trigger_action,
        },
    )
    return target_device


def _check_threshold(entry, source='system'):
    threshold = getattr(entry.device, 'threshold', None)
    if not threshold:
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

    target_device = _apply_threshold_action(threshold, source=source)
    message = (
        f'{entry.device.device_name} ({entry.metric or entry.device.device_subtype}) '
        f'ghi nhận {value}{entry.unit or ""} '
        f'{"cao hơn" if direction == Alert.DIRECTION_HIGH else "thấp hơn"} '
        f'ngưỡng {threshold_value}{entry.unit or ""}'
    )
    alert = Alert.objects.create(
        device=entry.device,
        threshold=threshold,
        threshold_direction=direction,
        threshold_value=threshold_value,
        actual_value=value,
        metric=entry.metric or entry.device.device_subtype,
        unit=entry.unit,
        triggered_action=threshold.trigger_action,
        target_device=target_device,
        message=message,
        metadata={
            'device_id': entry.device_id,
            'metric': entry.metric or entry.device.device_subtype,
            'actual_value': value,
            'threshold_value': threshold_value,
            'trigger_action': threshold.trigger_action,
            'target_device_id': target_device.device_id if target_device else None,
        },
    )
    create_activity_log(
        device=entry.device,
        source=ActivityLog.SOURCE_DEVICE if source == 'device' else ActivityLog.SOURCE_SYSTEM,
        category='alert',
        action='threshold_alert_created',
        details=message,
        metadata=alert.metadata,
    )
    broadcast_alert(alert.alert_id, entry.device_id, message)
    return alert


class SensorDataListView(APIView):
    def get(self, request):
        device_id = request.query_params.get('device')
        data = SensorData.objects.select_related('device', 'device__room', 'device__room__floor').all()
        if device_id:
            data = data.filter(device_id=device_id)
        serializer = SensorDataSerializer(data, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SensorDataSerializer(data=request.data)
        if serializer.is_valid():
            entry = serializer.save(metric=serializer.validated_data.get('metric') or serializer.validated_data['device'].device_subtype)
            device = entry.device
            device.current_value = entry.value
            device.unit = entry.unit or device.unit
            device.last_reading_at = timezone.now()
            device.save(update_fields=['current_value', 'unit', 'last_reading_at', 'updated_at'])
            _check_threshold(entry)
            broadcast_sensor_update(device.device_id, entry.value, entry.unit or '', device.device_id, entry.metric)
            return Response(SensorDataSerializer(entry).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SensorDataLatestView(APIView):
    def get(self, request):
        latest = []
        devices = Device.objects.filter(device_type=Device.TYPE_SENSOR)
        for device in devices:
            entry = SensorData.objects.filter(device=device).first()
            if entry:
                latest.append(entry)
        serializer = SensorDataSerializer(latest, many=True)
        return Response(serializer.data)


class SensorDataBySensorView(APIView):
    def get(self, request, sensor_id):
        data = SensorData.objects.filter(device_id=sensor_id)
        serializer = SensorDataSerializer(data, many=True)
        return Response(serializer.data)


class ThresholdListView(APIView):
    def get(self, request):
        thresholds = Threshold.objects.select_related('device', 'target_device').all()
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
        alerts = Alert.objects.select_related('device', 'device__room', 'device__room__floor', 'target_device').all()
        serializer = AlertSerializer(alerts, many=True)
        return Response(serializer.data)


class AlertUnreadListView(APIView):
    def get(self, request):
        alerts = Alert.objects.select_related('device', 'device__room', 'device__room__floor', 'target_device').filter(is_read=False)
        serializer = AlertSerializer(alerts, many=True)
        return Response(serializer.data)


class AlertDetailView(APIView):
    def get(self, request, pk):
        alert = get_object_or_404(Alert.objects.select_related('device', 'device__room', 'device__room__floor', 'target_device'), pk=pk)
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