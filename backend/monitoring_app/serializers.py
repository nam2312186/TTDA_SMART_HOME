from rest_framework import serializers
from .models import SensorData, Threshold, Alert


class SensorDataSerializer(serializers.ModelSerializer):
    device_name = serializers.SerializerMethodField()

    class Meta:
        model = SensorData
        fields = '__all__'

    def get_device_name(self, obj):
        return obj.sensor.device.device_name if obj.sensor and obj.sensor.device else None


class ThresholdSerializer(serializers.ModelSerializer):
    device_name = serializers.SerializerMethodField()

    class Meta:
        model = Threshold
        fields = '__all__'

    def get_device_name(self, obj):
        return obj.sensor.device.device_name if obj.sensor and obj.sensor.device else None


class AlertSerializer(serializers.ModelSerializer):
    device_name = serializers.SerializerMethodField()
    room_name = serializers.SerializerMethodField()
    floor_name = serializers.SerializerMethodField()

    def get_device_name(self, obj):
        if obj.sensor and obj.sensor.device:
            return obj.sensor.device.device_name
        return 'Unknown Device'

    def get_room_name(self, obj):
        if obj.sensor and obj.sensor.device and obj.sensor.device.room:
            return obj.sensor.device.room.room_name
        return 'Unknown Room'

    def get_floor_name(self, obj):
        if obj.sensor and obj.sensor.device and obj.sensor.device.room and obj.sensor.device.room.floor:
            return obj.sensor.device.room.floor.floor_name
        return 'Unknown Floor'

    class Meta:
        model = Alert
        fields = '__all__'
