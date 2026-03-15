from rest_framework import serializers
from .models import Schedule


class ScheduleSerializer(serializers.ModelSerializer):
    device_name = serializers.SerializerMethodField()
    room_name = serializers.SerializerMethodField()
    scope_name = serializers.SerializerMethodField()

    def get_device_name(self, obj):
        return obj.device.device_name if obj.device else None

    def get_room_name(self, obj):
        if obj.room:
            return obj.room.room_name
        if obj.device and obj.device.room:
            return obj.device.room.room_name
        return None

    def get_scope_name(self, obj):
        if obj.scope_type == Schedule.SCOPE_ROOM and obj.room:
            return obj.room.room_name
        if obj.device:
            return obj.device.device_name
        return None

    class Meta:
        model = Schedule
        fields = '__all__'
