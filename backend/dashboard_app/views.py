from rest_framework.views import APIView
from rest_framework.response import Response

from devices_app.models import Device, Sensor
from monitoring_app.models import SensorData, Alert


class DashboardSummaryView(APIView):
    """GET /api/dashboard/summary — Thống kê tổng quan hệ thống."""
    def get(self, request):
        total_devices = Device.objects.count()
        devices_on = Device.objects.filter(status=True).count()
        total_sensors = Sensor.objects.count()
        active_alerts = Alert.objects.filter(is_read=False).count()

        return Response({
            "total_devices": total_devices,
            "devices_on": devices_on,
            "devices_off": total_devices - devices_on,
            "total_sensors": total_sensors,
            "active_alerts": active_alerts,
        })


class DashboardTemperatureView(APIView):
    """GET /api/dashboard/temperature — Dữ liệu biểu đồ nhiệt độ (24h gần nhất)."""
    def get(self, request):
        sensors = Sensor.objects.filter(sensor_type='temperature').select_related('device')
        result = []
        for sensor in sensors:
            records = SensorData.objects.filter(sensor=sensor).order_by('-recorded_at')[:24]
            result.append({
                "sensor_id": sensor.sensor_id,
                "device_name": sensor.device.device_name,
                "data": [
                    {"value": r.value, "unit": r.unit, "recorded_at": r.recorded_at}
                    for r in reversed(list(records))
                ],
            })
        return Response(result)


class DashboardHumidityView(APIView):
    """GET /api/dashboard/humidity — Dữ liệu biểu đồ độ ẩm (24h gần nhất)."""
    def get(self, request):
        sensors = Sensor.objects.filter(sensor_type='humidity').select_related('device')
        result = []
        for sensor in sensors:
            records = SensorData.objects.filter(sensor=sensor).order_by('-recorded_at')[:24]
            result.append({
                "sensor_id": sensor.sensor_id,
                "device_name": sensor.device.device_name,
                "data": [
                    {"value": r.value, "unit": r.unit, "recorded_at": r.recorded_at}
                    for r in reversed(list(records))
                ],
            })
        return Response(result)


class DashboardDeviceStatusView(APIView):
    """GET /api/dashboard/device-status — Trạng thái tất cả thiết bị."""
    def get(self, request):
        devices = Device.objects.select_related('room').all()
        result = [
            {
                "device_id": d.device_id,
                "device_name": d.device_name,
                "device_type": d.device_type,
                "status": d.status,
                "room": d.room.room_name if d.room else None,
                "created_at": d.created_at,
            }
            for d in devices
        ]
        return Response(result)



class DashboardTemperatureView(APIView):
    """GET /api/dashboard/temperature — Dữ liệu biểu đồ nhiệt độ (24h gần nhất)."""
    def get(self, request):
        sensors = Sensor.objects.filter(sub_type='temperature').select_related('device')
        result = []
        for sensor in sensors:
            records = SensorData.objects.filter(sensor=sensor).order_by('-timestamp')[:24]
            result.append({
                "sensor_id": sensor.sensor_id,
                "device_name": sensor.device.name,
                "unit": sensor.unit,
                "data": [
                    {"value": r.value, "timestamp": r.timestamp}
                    for r in reversed(list(records))
                ],
            })
        return Response(result)


class DashboardHumidityView(APIView):
    """GET /api/dashboard/humidity — Dữ liệu biểu đồ độ ẩm (24h gần nhất)."""
    def get(self, request):
        sensors = Sensor.objects.filter(sub_type='humidity').select_related('device')
        result = []
        for sensor in sensors:
            records = SensorData.objects.filter(sensor=sensor).order_by('-timestamp')[:24]
            result.append({
                "sensor_id": sensor.sensor_id,
                "device_name": sensor.device.name,
                "unit": sensor.unit,
                "data": [
                    {"value": r.value, "timestamp": r.timestamp}
                    for r in reversed(list(records))
                ],
            })
        return Response(result)


class DashboardDeviceStatusView(APIView):
    """GET /api/dashboard/device-status — Trạng thái tất cả thiết bị."""
    def get(self, request):
        devices = Device.objects.select_related('room').all()
        result = [
            {
                "device_id": d.device_id,
                "name": d.name,
                "type": d.type,
                "sub_type": d.sub_type,
                "is_on": d.is_on,
                "room": d.room.name if d.room else None,
                "last_updated": d.last_updated,
            }
            for d in devices
        ]
        return Response(result)
