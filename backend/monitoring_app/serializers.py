from rest_framework import serializers
from .models import SensorData, Threshold, Alert


class SensorDataSerializer(serializers.ModelSerializer):
    device_name = serializers.SerializerMethodField()

    class Meta:
        model = SensorData
        fields = '__all__'

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

    def get_device_name(self, obj):
        device = obj.threshold.devices.first() if obj.threshold else None
        return device.device_name if device else 'Unknown Device'

    def get_room_name(self, obj):
        device = obj.threshold.devices.first() if obj.threshold else None
        if device and device.room:
            return device.room.room_name
        return 'Unknown Room'

    def get_floor_name(self, obj):
        device = obj.threshold.devices.first() if obj.threshold else None
        if device and device.room and device.room.floor:
            return device.room.floor.floor_name
        return 'Unknown Floor'

    class Meta:
        model = Alert
        fields = '__all__'
