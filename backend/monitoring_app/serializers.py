from rest_framework import serializers
from .models import SensorData, Threshold, Alert


class SensorDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = SensorData
        fields = '__all__'


class ThresholdSerializer(serializers.ModelSerializer):
    class Meta:
        model = Threshold
        fields = '__all__'


class AlertSerializer(serializers.ModelSerializer):
    device_id = serializers.SerializerMethodField()
    device_name = serializers.SerializerMethodField()
    room_name = serializers.SerializerMethodField()
    sensor_type = serializers.SerializerMethodField()

    def get_device_id(self, obj):
        try: return obj.sensor.device.device_id
        except: return None

    def get_device_name(self, obj):
        try: return obj.sensor.device.device_name
        except: return 'Unknown Device'

    def get_room_name(self, obj):
        try: return obj.sensor.device.room.room_name
        except: return 'Unknown Room'

    def get_sensor_type(self, obj):
        try: return obj.sensor.sensor_type
        except: return None

    class Meta:
        model = Alert
        fields = '__all__'
