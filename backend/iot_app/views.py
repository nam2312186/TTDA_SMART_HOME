from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import IoTToken
from .serializers import IoTTokenSerializer, IoTPushSerializer
from monitoring_app.models import SensorData
from monitoring_app.views import _check_threshold
from iot_app.broadcast import broadcast_sensor_update
from logs_app.utils import create_activity_log
from devices_app.models import Sensor


def _get_device_by_token(request):
    """Xác thực IoT device qua header Authorization: Token <token>."""
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Token '):
        return None
    raw = auth.split(' ', 1)[1]
    try:
        iot = IoTToken.objects.select_related('device').get(token=raw, is_active=True)
        iot.last_seen = timezone.now()
        iot.save(update_fields=['last_seen'])
        return iot.device
    except IoTToken.DoesNotExist:
        return None


# ─── IoT Push Data ────────────────────────────────────────────────────────────

class IoTPushView(APIView):
    """
    POST /api/iot/push/
    Header: Authorization: Token <device-token>
    Body: { "value": 25.5, "unit": "°C", "metric": "temperature" }

    Thiết bị IoT gọi endpoint này để gửi dữ liệu cảm biến lên hệ thống.
    """
    def post(self, request):
        device = _get_device_by_token(request)
        if device is None:
            return Response({'error': 'Token không hợp lệ hoặc thiết bị bị vô hiệu hóa'},
                            status=status.HTTP_401_UNAUTHORIZED)

        serializer = IoTPushSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        value = serializer.validated_data['value']
        sensor = Sensor.objects.filter(device=device).first()
        if sensor is None:
            return Response({'error': 'Device chưa có sensor trong bảng sensors'}, status=status.HTTP_400_BAD_REQUEST)

        unit = serializer.validated_data.get('unit') or ''
        metric = serializer.validated_data.get('metric') or sensor.sensor_type

        data = SensorData.objects.create(sensor=sensor, value=value, unit=unit)
        _check_threshold(data, source='device')
        broadcast_sensor_update(sensor.sensor_id, value, unit, device.device_id, metric)
        create_activity_log(
            device=device,
            action='iot_sensor_data_received',
            details=f'Received {metric}: {value}{unit}',
        )

        return Response({
            'message': 'Dữ liệu đã được lưu',
            'data_id': data.data_id,
            'device_id': device.device_id,
            'metric': metric,
            'value': value,
            'unit': unit,
            'recorded_at': data.recorded_at,
        }, status=status.HTTP_201_CREATED)


class IoTPushBatchView(APIView):
    """
    POST /api/iot/push/batch/
    Header: Authorization: Token <device-token>
    Body: [ { "value": 25.5, "unit": "°C", "metric": "temperature" }, ... ]

    Gửi nhiều mẫu đo của cùng một device sensor.
    """
    def post(self, request):
        device = _get_device_by_token(request)
        if device is None:
            return Response({'error': 'Token không hợp lệ'}, status=status.HTTP_401_UNAUTHORIZED)

        sensor = Sensor.objects.filter(device=device).first()
        if sensor is None:
            return Response({'error': 'Device chưa có sensor trong bảng sensors'}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(request.data, list):
            return Response({'error': 'Body phải là array'}, status=status.HTTP_400_BAD_REQUEST)

        results = []
        for item in request.data:
            s = IoTPushSerializer(data=item)
            if not s.is_valid():
                results.append({'error': s.errors})
                continue
            metric = s.validated_data.get('metric') or sensor.sensor_type
            unit = s.validated_data.get('unit') or ''
            data = SensorData.objects.create(
                sensor=sensor,
                value=s.validated_data['value'],
                unit=unit,
            )
            _check_threshold(data, source='device')
            broadcast_sensor_update(sensor.sensor_id, data.value, unit, device.device_id, metric)
            create_activity_log(
                device=device,
                action='iot_sensor_data_received',
                details=f'Received batch {metric}: {s.validated_data["value"]}{unit}',
            )
            results.append({'data_id': data.data_id, 'device_id': device.device_id, 'metric': metric, 'ok': True})

        return Response(results, status=status.HTTP_201_CREATED)


# ─── Token Management ─────────────────────────────────────────────────────────

class IoTTokenListView(APIView):
    """GET /api/iot/tokens/ — danh sách token | POST — tạo token cho device."""
    def get(self, request):
        tokens = IoTToken.objects.select_related('device').all()
        return Response(IoTTokenSerializer(tokens, many=True).data)

    def post(self, request):
        serializer = IoTTokenSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class IoTTokenDetailView(APIView):
    """GET/PUT/DELETE /api/iot/tokens/{id}/"""
    def get(self, request, pk):
        token = get_object_or_404(IoTToken, pk=pk)
        return Response(IoTTokenSerializer(token).data)

    def put(self, request, pk):
        token = get_object_or_404(IoTToken, pk=pk)
        serializer = IoTTokenSerializer(token, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        token = get_object_or_404(IoTToken, pk=pk)
        token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class IoTTokenRegenerateView(APIView):
    """POST /api/iot/tokens/{id}/regenerate/ — tạo lại token mới."""
    def post(self, request, pk):
        import secrets
        token = get_object_or_404(IoTToken, pk=pk)
        token.token = secrets.token_hex(32)
        token.save()
        return Response({'token': token.token, 'message': 'Token đã được tạo lại'})
