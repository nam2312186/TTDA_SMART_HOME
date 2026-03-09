from rest_framework import serializers
from .models import Schedule


class ScheduleSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device_id.device_name', read_only=True)
    
    class Meta:
        model = Schedule
        fields = ['schedule_id', 'device_id', 'device_name', 'action', 'schedule_time', 'repeat_type', 'status']
        read_only_fields = ['schedule_id', 'device_name']
