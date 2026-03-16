from collections import defaultdict

from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncDay, TruncMonth, TruncYear
from rest_framework.response import Response
from rest_framework.views import APIView

from building_app.models import Floor, Room
from devices_app.models import Device, Sensor
from logs_app.models import ActivityLog
from monitoring_app.models import Alert, SensorData


PERIOD_MAP = {
    'day': TruncDay,
    'month': TruncMonth,
    'year': TruncYear,
}


class DashboardSummaryView(APIView):
    def get(self, request):
        total_devices = Device.objects.count()
        sensor_devices = Sensor.objects.count()
        actuator_devices = Device.objects.filter(device_type=Device.TYPE_ACTUATOR).count()
        devices_on = Device.objects.filter(status=True).count()
        active_alerts = Alert.objects.filter(is_read=False).count()

        floor_stats = []
        room_stats = []
        floors = Floor.objects.order_by('floor_id')
        for floor in floors:
            floor_rooms = Room.objects.filter(floor=floor)
            room_count = floor_rooms.count()
            device_count = Device.objects.filter(room__floor=floor).count()
            sensor_count = Sensor.objects.filter(device__room__floor=floor).count()
            actuator_count = Device.objects.filter(room__floor=floor, device_type=Device.TYPE_ACTUATOR).count()
            floor_stats.append({
                'floor_id': floor.floor_id,
                'floor_name': floor.floor_name,
                'room_count': room_count,
                'device_count': device_count,
                'sensor_count': sensor_count,
                'actuator_count': actuator_count,
            })
            for room in floor_rooms:
                room_stats.append({
                    'room_id': room.room_id,
                    'room_name': room.room_name,
                    'floor_id': floor.floor_id,
                    'floor_name': floor.floor_name,
                    'device_count': Device.objects.filter(room=room).count(),
                    'sensor_count': Sensor.objects.filter(device__room=room).count(),
                    'actuator_count': Device.objects.filter(room=room, device_type=Device.TYPE_ACTUATOR).count(),
                })

        return Response({
            'total_devices': total_devices,
            'sensor_devices': sensor_devices,
            'actuator_devices': actuator_devices,
            'devices_on': devices_on,
            'devices_off': total_devices - devices_on,
            'active_alerts': active_alerts,
            'floor_stats': floor_stats,
            'room_stats': room_stats,
        })


class DashboardMetricView(APIView):
    metric_name = ''

    def get(self, request):
        sensor_data = SensorData.objects.select_related('sensor', 'sensor__device', 'sensor__device__room', 'sensor__device__room__floor').filter(sensor__sensor_type=self.metric_name)
        result = []
        for sensor in Sensor.objects.select_related('device', 'device__room', 'device__room__floor').filter(sensor_type=self.metric_name):
            device = sensor.device
            records = sensor_data.filter(sensor=sensor).order_by('-recorded_at')[:24]
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
        devices = Device.objects.select_related('room', 'room__floor').all()
        return Response([
            {
                'device_id': device.device_id,
                'device_name': device.device_name,
                'device_type': device.device_type,
                'status': device.status,
                'room_name': device.room.room_name if device.room else None,
                'floor_name': device.room.floor.floor_name if device.room and device.room.floor else None,
                'created_at': device.created_at,
            }
            for device in devices
        ])


class DashboardAnalyticsView(APIView):
    def get(self, request):
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

        if metric == 'device_activity':
            logs = ActivityLog.objects.select_related('device', 'device__room', 'device__room__floor').filter(device__isnull=False)
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
            data = SensorData.objects.select_related('sensor', 'sensor__device', 'sensor__device__room', 'sensor__device__room__floor').filter(sensor__sensor_type=metric)
            grouped = data.annotate(bucket=trunc('recorded_at')).values(
                'bucket',
                'sensor__device__room__room_id',
                'sensor__device__room__room_name',
                'sensor__device__room__floor__floor_id',
                'sensor__device__room__floor__floor_name',
                'unit',
            ).annotate(value=Avg('value')).order_by('bucket')
            for item in grouped:
                scope_id = item['sensor__device__room__floor__floor_id'] if scope == 'floor' else item['sensor__device__room__room_id']
                scope_name = item['sensor__device__room__floor__floor_name'] if scope == 'floor' else item['sensor__device__room__room_name']
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