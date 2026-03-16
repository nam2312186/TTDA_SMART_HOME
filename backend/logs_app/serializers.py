from rest_framework import serializers
from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    device_name = serializers.SerializerMethodField()
    room_name = serializers.SerializerMethodField()
    floor_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            'log_id',
            'user',
            'device',
            'action',
            'action_time',
            'user_name',
            'device_name',
            'room_name',
            'floor_name',
        ]

    def get_user_name(self, obj):
        return obj.user.username if obj.user else None

    def get_device_name(self, obj):
        return obj.device.device_name if obj.device else None

    def get_room_name(self, obj):
        if obj.device and obj.device.room:
            return obj.device.room.room_name
        return None

    def get_floor_name(self, obj):
        if obj.device and obj.device.room and obj.device.room.floor:
            return obj.device.room.floor.floor_name
        return None
