import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from .models import SensorData, Threshold, Alert
from .serializers import ThresholdSerializer, SensorDataSerializer, AlertSerializer
from devices_app.models import Device
from users_app.models import User
from building_app.models import RoomManagement

logger = logging.getLogger(__name__)


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

def _check_threshold(entry, source='system'):
    """
    Tạo alert cho thiết bị đã cấu hình ngưỡng, có cooldown 5p.
    Nếu require_motion=True, chỉ alert nếu có motion trong vòng 2p.
    """
    device = entry.device
    if not device or not device.threshold:
        return

    threshold = device.threshold
    if threshold.min_value is None and threshold.max_value is None:
        return

    val = entry.value
    try:
        f_val = float(val)
    except (TypeError, ValueError):
        return

    is_violated = False
    if threshold.min_value is not None and f_val < threshold.min_value:
        is_violated = True
    if threshold.max_value is not None and f_val > threshold.max_value:
        is_violated = True

    if not is_violated:
        return

    # Motion check: apply only when motion capability is available in the system.
    has_motion_sensor = Device.objects.filter(type__name_type__icontains='motion').exists()
    if threshold.require_motion and has_motion_sensor:
        two_min_ago = timezone.now() - timedelta(minutes=2)
        recent_motion = SensorData.objects.filter(
            device__type__name_type__icontains='motion',
            value__in=[1.0, 1], # SensorData value is Float
            recorded_at__gte=two_min_ago
        ).exists()
        if not recent_motion:
            return

    # Cooldown logic (5 mins)
    cooldown_mins = getattr(settings, 'ALERT_COOLDOWN_MINUTES', 5)
    cooldown_time = timezone.now() - timedelta(minutes=cooldown_mins)
    recent_alert = Alert.objects.filter(
        threshold=threshold,
        created_at__gte=cooldown_time
    ).exists()

    if not recent_alert:
        msg = f"Cảnh báo: {device.device_name} giá trị {f_val} vượt ngưỡng!"
        Alert.objects.create(
            threshold=threshold,
            message=msg,
            value=f_val,
            # status='active' # Alert model has status field in migration 0001? 
            # Wait, migration 0001 says Alert has [alert_id, value, message, created_at]. NO status field is shown in the migration operation I viewed.
            # BUT earlier viewed serializers used status. Let me re-verify migration 0001 Alert fields.
        )
        # Prune old alerts
        max_alerts = getattr(settings, 'MAX_ALERT_RETENTION', 100)
        if Alert.objects.count() > max_alerts:
            last_keep = Alert.objects.order_by('-created_at')[max_alerts-1].created_at
            Alert.objects.filter(created_at__lt=last_keep).delete()

class ThresholdListView(APIView):
    def get(self, request):
        thresholds = Threshold.objects.all()
        serializer = ThresholdSerializer(thresholds, many=True)
        return Response(serializer.data)

    def post(self, request):
        device_id = request.data.get('device_id')
        serializer = ThresholdSerializer(data=request.data)
        if serializer.is_valid():
            threshold = serializer.save()
            if device_id:
                try:
                    device = Device.objects.get(pk=device_id)
                    device.threshold = threshold
                    device.save(update_fields=['threshold'])
                except Device.DoesNotExist:
                    pass
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ThresholdDetailView(APIView):
    def get(self, request, pk):
        threshold = Threshold.objects.get(pk=pk)
        serializer = ThresholdSerializer(threshold)
        return Response(serializer.data)

    def put(self, request, pk):
        threshold = Threshold.objects.get(pk=pk)
        serializer = ThresholdSerializer(threshold, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        threshold = Threshold.objects.get(pk=pk)
        threshold.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class SensorDataListView(APIView):
    def get(self, request):
        sensor_data = SensorData.objects.all().order_by('-recorded_at')[:50]
        serializer = SensorDataSerializer(sensor_data, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SensorDataSerializer(data=request.data)
        if serializer.is_valid():
            entry = serializer.save()
            _check_threshold(entry)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SensorDataLatestView(APIView):
    def get(self, request):
        from django.db.models import Max
        # Current schema has one sensor stream per device and PK = data_id.
        latest_ids = (
            SensorData.objects.values('device')
            .annotate(max_data_id=Max('data_id'))
            .values_list('max_data_id', flat=True)
        )
        sensor_data = SensorData.objects.filter(data_id__in=latest_ids)
        serializer = SensorDataSerializer(sensor_data, many=True)
        return Response(serializer.data)

class SensorDataByDeviceView(APIView):
    def get(self, request, device_id):
        sensor_data = SensorData.objects.filter(device_id=device_id).order_by('-recorded_at')[:50]
        serializer = SensorDataSerializer(sensor_data, many=True)
        return Response(serializer.data)

class AlertListView(APIView):
    def get(self, request):
        user, error = _require_authenticated(request)
        if error:
            return error

        alerts = Alert.objects.all()
        if not _is_admin(user):
            allowed_room_ids = RoomManagement.objects.filter(user=user).values_list('room_id', flat=True)
            alerts = alerts.filter(threshold__devices__room_id__in=allowed_room_ids)

        alerts = alerts.order_by('-created_at').distinct()
        serializer = AlertSerializer(alerts, many=True)
        return Response(serializer.data)

class AlertDetailView(APIView):
    def delete(self, request, pk):
        user, error = _require_authenticated(request)
        if error:
            return error

        alert = Alert.objects.get(pk=pk)

        if not _is_admin(user):
            allowed_room_ids = set(
                RoomManagement.objects.filter(user=user).values_list('room_id', flat=True)
            )
            alert_room_ids = set(
                Device.objects.filter(threshold_id=alert.threshold_id).values_list('room_id', flat=True)
            )
            if not alert_room_ids.intersection(allowed_room_ids):
                return Response({'error': 'Permission denied for this alert'}, status=status.HTTP_403_FORBIDDEN)

        alert.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)