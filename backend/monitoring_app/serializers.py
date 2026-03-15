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
    device_name = serializers.SerializerMethodField()
    target_device_name = serializers.SerializerMethodField()

    class Meta:
        model = Threshold
        fields = '__all__'

    def get_device_name(self, obj):
        return obj.device.device_name if obj.device else None

    def get_target_device_name(self, obj):
        return obj.target_device.device_name if obj.target_device else None


class AlertSerializer(serializers.ModelSerializer):
    device_name = serializers.SerializerMethodField()
    room_name = serializers.SerializerMethodField()
    floor_name = serializers.SerializerMethodField()
    target_device_name = serializers.SerializerMethodField()

    def get_device_name(self, obj):
        return obj.device.device_name if obj.device else 'Unknown Device'

    def get_room_name(self, obj):
        if obj.device and obj.device.room:
            return obj.device.room.room_name
        return 'Unknown Room'

    def get_floor_name(self, obj):
        if obj.device and obj.device.room and obj.device.room.floor:
            return obj.device.room.floor.floor_name
        return 'Unknown Floor'

    def get_target_device_name(self, obj):
        return obj.target_device.device_name if obj.target_device else None

    class Meta:
        model = Alert
        fields = '__all__'
