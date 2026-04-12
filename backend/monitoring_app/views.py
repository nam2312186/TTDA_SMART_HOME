from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from iot_app.broadcast import broadcast_alert, broadcast_sensor_update
from logs_app.utils import create_activity_log

from .models import Alert, SensorData, Threshold
from .serializers import AlertSerializer, SensorDataSerializer, ThresholdSerializer


MAX_ALERT_RETENTION = 20


def _prune_old_alerts(max_keep=MAX_ALERT_RETENTION):
    old_ids = list(
        Alert.objects.order_by('-created_at').values_list('alert_id', flat=True)[max_keep:]
    )
    if old_ids:
        Alert.objects.filter(alert_id__in=old_ids).delete()


def _check_threshold(entry, source='system'):
    """Tạo alert cho mọi thiết bị đã cấu hình ngưỡng."""
    device = entry.device
    if not device:
        return None

    threshold = device.threshold
    if threshold is None:
        return None

    # Nếu user xoá cả min/max thì xem như tắt cảnh báo cho thiết bị này.
    if threshold.min_value is None and threshold.max_value is None:
        return None

    value = entry.value
    threshold_value = None
    direction_label = None

    if threshold.max_value is not None and value > threshold.max_value:
        direction_label = 'cao hơn'
        threshold_value = threshold.max_value
    elif threshold.min_value is not None and value < threshold.min_value:
        direction_label = 'thấp hơn'
        threshold_value = threshold.min_value

    if direction_label is None:
        return None

    message = (
        f'{device.device_name} ghi nhận {value}{entry.unit or ""} '
        f'{direction_label} ngưỡng {threshold_value}{entry.unit or ""}'
    )
    alert = Alert.objects.create(
        threshold=threshold,
        value=value,
        message=message,
    )
    create_activity_log(
        device=device,
        action='threshold_alert_created',
        details=message,
    )
    broadcast_alert(alert.alert_id, device.device_id, message, device.device_id)
    _prune_old_alerts()
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
            entry = serializer.save()
            _check_threshold(entry)
            device = entry.device
            type_name = device.type.name_type if device.type else 'sensor'
            broadcast_sensor_update(device.device_id, entry.value, entry.unit or '', device.device_id, type_name)
            return Response(SensorDataSerializer(entry).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SensorDataLatestView(APIView):
    def get(self, request):
        from devices_app.models import Device
        latest = []
        devices = Device.objects.all()
        for device in devices:
            # Lấy bản ghi MỚI NHẤT cho mỗi thiết bị (ordering model là -recorded_at)
            entry = SensorData.objects.filter(device=device).order_by('-recorded_at').first()
            if entry:
                latest.append(entry)
        serializer = SensorDataSerializer(latest, many=True)
        return Response(serializer.data)


class SensorDataByDeviceView(APIView):
    def get(self, request, device_id):
        """
        GET /api/sensor-data/device/<device_id>/
        Query params:
          - period=day|month|year  -> lọc theo khoảng thời gian
          - limit=N                -> giới hạn số bản ghi (default 500)
          - order=asc|desc         -> sắp xếp (default asc theo recorded_at)
        """
        period = request.query_params.get('period', None)
        limit = int(request.query_params.get('limit', 500))
        order = request.query_params.get('order', 'asc')

        qs = SensorData.objects.filter(device_id=device_id)

        # Lọc theo period
        if period == 'day':
            start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            qs = qs.filter(recorded_at__gte=start)
        elif period == 'month':
            now = timezone.now()
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            qs = qs.filter(recorded_at__gte=start)
        elif period == 'year':
            now = timezone.now()
            start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            qs = qs.filter(recorded_at__gte=start)
        # Nếu không có period (None), trả về tất cả (FE tự lọc)

        # Sắp xếp
        if order == 'desc':
            qs = qs.order_by('-recorded_at')
        else:
            qs = qs.order_by('recorded_at')

        # Giới hạn
        qs = qs[:limit]

        serializer = SensorDataSerializer(qs, many=True)
        return Response(serializer.data)


class ThresholdListView(APIView):
    def get(self, request):
        thresholds = Threshold.objects.all()
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
        alerts = Alert.objects.select_related('threshold').all()
        serializer = AlertSerializer(alerts, many=True)
        return Response(serializer.data)


class AlertDetailView(APIView):
    def get(self, request, pk):
        alert = get_object_or_404(Alert.objects.select_related('threshold'), pk=pk)
        serializer = AlertSerializer(alert)
        return Response(serializer.data)

    def delete(self, request, pk):
        alert = get_object_or_404(Alert, pk=pk)
        alert.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)