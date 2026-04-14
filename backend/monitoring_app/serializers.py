from rest_framework import serializers
from .models import SensorData, Threshold, Alert

class SensorDataSerializer(serializers.ModelSerializer):
    device_name = serializers.SerializerMethodField()

    class Meta:
        model = SensorData
        fields = ['data_id', 'device', 'device_name', 'value', 'unit', 'recorded_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        value = data.get('value')
        try:
            data['value'] = round(float(value), 2)
        except (TypeError, ValueError):
            pass
        return data

    def get_device_name(self, obj):
        return obj.device.device_name if obj.device else None

class ThresholdSerializer(serializers.ModelSerializer):
    class Meta:
        model = Threshold
        fields = '__all__'

class AlertSerializer(serializers.ModelSerializer):
    device_name = serializers.SerializerMethodField()
    room_name = serializers.SerializerMethodField()
    floor_name = serializers.SerializerMethodField()

    class Meta:
        model = Alert
        fields = ['alert_id', 'threshold', 'device_name', 'room_name', 'floor_name', 'value', 'message', 'created_at']

    def get_device_name(self, obj):
        device = obj.threshold.devices.first() if obj.threshold and hasattr(obj.threshold, 'devices') else None
        if not device and obj.threshold:
            # Fallback if reverse relation name is different
            device = obj.threshold.device_set.first() if hasattr(obj.threshold, 'device_set') else None
        return device.device_name if device else 'Unknown Device'

    def get_room_name(self, obj):
        device = None
        if obj.threshold and hasattr(obj.threshold, 'devices'):
            device = obj.threshold.devices.first()
        elif obj.threshold and hasattr(obj.threshold, 'device_set'):
            device = obj.threshold.device_set.first()
            
        if device and device.room:
            return device.room.room_name
        return 'Unknown Room'

    def get_floor_name(self, obj):
        device = None
        if obj.threshold and hasattr(obj.threshold, 'devices'):
            device = obj.threshold.devices.first()
        elif obj.threshold and hasattr(obj.threshold, 'device_set'):
            device = obj.threshold.device_set.first()

        if device and device.room and device.room.floor:
            return device.room.floor.floor_name
        return 'Unknown Floor'
