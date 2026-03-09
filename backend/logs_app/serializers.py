from rest_framework import serializers
from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user_id.username', read_only=True)
    device_name = serializers.CharField(source='device_id.device_name', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = ['log_id', 'user_id', 'username', 'device_id', 'device_name', 'action', 'action_time']
        read_only_fields = ['log_id', 'action_time', 'username', 'device_name']
