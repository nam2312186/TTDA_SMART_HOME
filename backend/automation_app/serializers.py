from rest_framework import serializers
from .models import Schedule


class ScheduleSerializer(serializers.ModelSerializer):
    device_name = serializers.SerializerMethodField()

    def get_device_name(self, obj):
        return obj.device.device_name if obj.device else None

    class Meta:
        model = Schedule
        fields = '__all__'
