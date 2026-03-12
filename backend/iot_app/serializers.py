from rest_framework import serializers
from .models import IoTToken
from monitoring_app.models import SensorData


class IoTTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = IoTToken
        fields = ['id', 'token', 'device', 'label', 'is_active', 'last_seen', 'created_at']
        read_only_fields = ['token', 'last_seen', 'created_at']


class IoTPushSerializer(serializers.Serializer):
    """Payload thiết bị IoT gửi dữ liệu cảm biến lên."""
    sensor_id = serializers.IntegerField()
    value = serializers.FloatField()
    unit = serializers.CharField(max_length=20)
