import secrets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import IoTToken
from .serializers import IoTTokenSerializer, IoTPushSerializer
from monitoring_app.models import SensorData
from monitoring_app.views import _check_threshold
from iot_app.broadcast import broadcast_sensor_update, broadcast_device_status
from logs_app.utils import create_activity_log


def _get_device_by_token(request):
    """Xác thực IoT device qua header Authorization: Token <token>."""
    # Lưu ý cho team IoT: token này được điền trong firmware ESP32/Arduino,
    # BE không hard-code token trong source code.
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


# ─── IoT Push Data ──────────────────────────────────────────────────────

class IoTPushView(APIView):
    """
    POST /api/iot/push/
    Header: Authorization: Token <device-token>
    Body: { "value": 25.5, "unit": "°C", "metric": "temperature" }

    Thiết bị IoT gọi endpoint này để gửi dữ liệu cảm biến lên hệ thống.
    Chỗ điền giá trị thật nằm ở firmware: SERVER_URL, IOT_TOKEN, metric.
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
        unit = serializer.validated_data.get('unit') or ''
        metric = serializer.validated_data.get('metric') or (device.type.name_type if device.type else 'sensor')

        # Light actuator payload uses brightness (0-255), status is derived by backend.
        is_light_actuator = bool(device.type and device.type.name_type == 'light' and device.threshold_id is None)
        if is_light_actuator and metric == 'light':
            brightness = max(0, min(255, int(value)))
            device.brightness = brightness
            device.status = brightness > 0
            device.save(update_fields=['brightness', 'status'])
            broadcast_device_status(device.device_id, device.status, device.device_name, brightness)
            create_activity_log(
                device=device,
                action='iot_device_brightness_received',
                details=f'Received brightness: {brightness}/255',
            )
            return Response({
                'message': 'Độ sáng đã được cập nhật',
                'device_id': device.device_id,
                'metric': metric,
                'brightness': brightness,
                'status': device.status,
            }, status=status.HTTP_201_CREATED)

        data = SensorData.objects.create(device=device, value=value, unit=unit)
        _check_threshold(data, source='device')
        broadcast_sensor_update(device.device_id, value, unit, device.device_id, metric)
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

        if not isinstance(request.data, list):
            return Response({'error': 'Body phải là array'}, status=status.HTTP_400_BAD_REQUEST)

        results = []
        for item in request.data:
            s = IoTPushSerializer(data=item)
            if not s.is_valid():
                results.append({'error': s.errors})
                continue
            metric = s.validated_data.get('metric') or (device.type.name_type if device.type else 'sensor')
            unit = s.validated_data.get('unit') or ''

            is_light_actuator = bool(device.type and device.type.name_type == 'light' and device.threshold_id is None)
            if is_light_actuator and metric == 'light':
                brightness = max(0, min(255, int(s.validated_data['value'])))
                device.brightness = brightness
                device.status = brightness > 0
                device.save(update_fields=['brightness', 'status'])
                broadcast_device_status(device.device_id, device.status, device.device_name, brightness)
                create_activity_log(
                    device=device,
                    action='iot_device_brightness_received',
                    details=f'Received batch brightness: {brightness}/255',
                )
                results.append({'device_id': device.device_id, 'metric': metric, 'brightness': brightness, 'ok': True})
                continue

            data = SensorData.objects.create(
                device=device,
                value=s.validated_data['value'],
                unit=unit,
            )
            _check_threshold(data, source='device')
            broadcast_sensor_update(device.device_id, data.value, unit, device.device_id, metric)
            create_activity_log(
                device=device,
                action='iot_sensor_data_received',
                details=f'Received batch {metric}: {s.validated_data["value"]}{unit}',
            )
            results.append({'data_id': data.data_id, 'device_id': device.device_id, 'metric': metric, 'ok': True})

        return Response(results, status=status.HTTP_201_CREATED)


# ─── Token Management ──────────────────────────────────────────────────────────

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
    """POST /api/iot/tokens/{id}/regenerate/"""

    def post(self, request, pk):
        token = get_object_or_404(IoTToken, pk=pk)
        token.token = secrets.token_hex(32)
        token.save(update_fields=['token'])
        return Response(IoTTokenSerializer(token).data, status=status.HTTP_200_OK)
