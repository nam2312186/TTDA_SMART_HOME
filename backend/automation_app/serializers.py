from rest_framework import serializers
from .models import Schedule, AutomationRule, IsMonitor


class ScheduleSerializer(serializers.ModelSerializer):
    room_name = serializers.SerializerMethodField()

    def get_room_name(self, obj):
        return obj.room.room_name if obj.room else None

    class Meta:
        model = Schedule
        fields = '__all__'


class AutomationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationRule
        fields = '__all__'


class IsMonitorSerializer(serializers.ModelSerializer):
    class Meta:
        model = IsMonitor
        fields = '__all__'
