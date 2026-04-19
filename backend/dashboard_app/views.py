from collections import defaultdict

from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncDay, TruncMonth, TruncYear
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView

from building_app.models import Floor, Room
from building_app.models import RoomManagement
from devices_app.models import Device
from logs_app.models import ActivityLog
from monitoring_app.models import Alert, SensorData
from users_app.models import User


PERIOD_MAP = {
    'day': TruncDay,
    'month': TruncMonth,
    'year': TruncYear,
}


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


def _allowed_room_ids(user):
    if _is_admin(user):
        return None
    return RoomManagement.objects.filter(user=user).values_list('room_id', flat=True)


class DashboardSummaryView(APIView):
    def get(self, request):
        user, error = _require_authenticated(request)
        if error:
            return error

        allowed_room_ids = _allowed_room_ids(user)

        device_qs = Device.objects.all()
        alert_qs = Alert.objects.all()
        floors_qs = Floor.objects.order_by('floor_id')
        rooms_qs = Room.objects.all()

        if allowed_room_ids is not None:
            device_qs = device_qs.filter(room_id__in=allowed_room_ids)
            alert_qs = alert_qs.filter(threshold__devices__room_id__in=allowed_room_ids).distinct()
            floors_qs = floors_qs.filter(rooms__room_id__in=allowed_room_ids).distinct()
            rooms_qs = rooms_qs.filter(room_id__in=allowed_room_ids)

        total_devices = device_qs.count()
        devices_on = device_qs.filter(status=True).count()
        active_alerts = alert_qs.count()

        floor_stats = []
        room_stats = []
        floors = floors_qs
        for floor in floors:
            floor_rooms = rooms_qs.filter(floor=floor)
            room_count = floor_rooms.count()
            device_count = device_qs.filter(room__floor=floor).count()
            floor_stats.append({
                'floor_id': floor.floor_id,
                'floor_name': floor.floor_name,
                'room_count': room_count,
                'device_count': device_count,
            })
            for room in floor_rooms:
                room_stats.append({
                    'room_id': room.room_id,
                    'room_name': room.room_name,
                    'floor_id': floor.floor_id,
                    'floor_name': floor.floor_name,
                    'device_count': Device.objects.filter(room=room).count(),
                })

        return Response({
            'total_devices': total_devices,
            'devices_on': devices_on,
            'devices_off': total_devices - devices_on,
            'active_alerts': active_alerts,
            'floor_stats': floor_stats,
            'room_stats': room_stats,
        })


class DashboardMetricView(APIView):
    metric_name = ''

    def get(self, request):
        user, error = _require_authenticated(request)
        if error:
            return error

        allowed_room_ids = _allowed_room_ids(user)
        sensor_data = SensorData.objects.select_related('device', 'device__room', 'device__room__floor').filter(device__type__name_type=self.metric_name)
        devices_qs = Device.objects.select_related('room', 'room__floor', 'type').filter(type__name_type=self.metric_name)

        if allowed_room_ids is not None:
            sensor_data = sensor_data.filter(device__room_id__in=allowed_room_ids)
            devices_qs = devices_qs.filter(room_id__in=allowed_room_ids)

        result = []
        for device in devices_qs:
            records = sensor_data.filter(device=device).order_by('-recorded_at')[:24]
            result.append({
                'device_id': device.device_id,
                'device_name': device.device_name,
                'room_name': device.room.room_name if device.room else None,
                'floor_name': device.room.floor.floor_name if device.room and device.room.floor else None,
                'data': [
                    {'value': record.value, 'unit': record.unit, 'recorded_at': record.recorded_at}
                    for record in reversed(list(records))
                ],
            })
        return Response(result)


class DashboardTemperatureView(DashboardMetricView):
    metric_name = 'temperature'


class DashboardHumidityView(DashboardMetricView):
    metric_name = 'humidity'


class DashboardLightView(DashboardMetricView):
    metric_name = 'light'


class DashboardDeviceStatusView(APIView):
    def get(self, request):
        user, error = _require_authenticated(request)
        if error:
            return error

        devices = Device.objects.select_related('room', 'room__floor', 'type').all()
        allowed_room_ids = _allowed_room_ids(user)
        if allowed_room_ids is not None:
            devices = devices.filter(room_id__in=allowed_room_ids)

        return Response([
            {
                'device_id': device.device_id,
                'device_name': device.device_name,
            'type_name': device.type.name_type if device.type else None,
                'status': device.status,
                'room_name': device.room.room_name if device.room else None,
                'floor_name': device.room.floor.floor_name if device.room and device.room.floor else None,
                'created_at': device.created_at,
            }
            for device in devices
        ])


class DashboardAnalyticsView(APIView):
    def get(self, request):
        user, error = _require_authenticated(request)
        if error:
            return error

        scope = request.query_params.get('scope', 'floor')
        metric = request.query_params.get('metric', 'temperature')
        period = request.query_params.get('period', 'day')
        if scope not in {'floor', 'room'}:
            return Response({'detail': 'scope must be floor or room'}, status=400)
        if metric not in {'temperature', 'humidity', 'light', 'device_activity'}:
            return Response({'detail': 'unsupported metric'}, status=400)
        if period not in PERIOD_MAP:
            return Response({'detail': 'period must be day, month, or year'}, status=400)

        trunc = PERIOD_MAP[period]
        records_by_scope = defaultdict(list)
        allowed_room_ids = _allowed_room_ids(user)

        if metric == 'device_activity':
            logs = ActivityLog.objects.select_related('device', 'device__room', 'device__room__floor').filter(device__isnull=False)
            if allowed_room_ids is not None:
                logs = logs.filter(device__room_id__in=allowed_room_ids)
            grouped = logs.annotate(bucket=trunc('action_time')).values(
                'bucket',
                'device__room__room_id',
                'device__room__room_name',
                'device__room__floor__floor_id',
                'device__room__floor__floor_name',
            ).annotate(value=Count('log_id')).order_by('bucket')
            for item in grouped:
                scope_id = item['device__room__floor__floor_id'] if scope == 'floor' else item['device__room__room_id']
                scope_name = item['device__room__floor__floor_name'] if scope == 'floor' else item['device__room__room_name']
                if not scope_id:
                    continue
                records_by_scope[str(scope_id)].append({
                    'bucket': item['bucket'],
                    'label': scope_name,
                    'value': item['value'],
                })
        else:
            data = SensorData.objects.select_related('device', 'device__room', 'device__room__floor').filter(device__type__name_type=metric)
            if allowed_room_ids is not None:
                data = data.filter(device__room_id__in=allowed_room_ids)
            grouped = data.annotate(bucket=trunc('recorded_at')).values(
                'bucket',
                'device__room__room_id',
                'device__room__room_name',
                'device__room__floor__floor_id',
                'device__room__floor__floor_name',
                'unit',
            ).annotate(value=Avg('value')).order_by('bucket')
            for item in grouped:
                scope_id = item['device__room__floor__floor_id'] if scope == 'floor' else item['device__room__room_id']
                scope_name = item['device__room__floor__floor_name'] if scope == 'floor' else item['device__room__room_name']
                if not scope_id:
                    continue
                records_by_scope[str(scope_id)].append({
                    'bucket': item['bucket'],
                    'label': scope_name,
                    'value': round(item['value'] or 0, 2),
                    'unit': item['unit'],
                })

        series = []
        for scope_id, values in records_by_scope.items():
            label = values[0]['label'] if values else scope_id
            series.append({
                'scope_id': scope_id,
                'scope_name': label,
                'points': [
                    {
                        'bucket': value['bucket'],
                        'value': value['value'],
                        'unit': value.get('unit'),
                    }
                    for value in values
                ],
            })

        series.sort(key=lambda item: item['scope_name'])
        return Response({
            'scope': scope,
            'metric': metric,
            'period': period,
            'series': series,
        })