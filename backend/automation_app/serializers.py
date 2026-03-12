from rest_framework import serializers
from .models import Schedule


class ScheduleSerializer(serializers.ModelSerializer):
    device_name = serializers.SerializerMethodField()
    room_name = serializers.SerializerMethodField()

    def get_device_name(self, obj):
        try: return obj.device.device_name
        except: return 'Unknown Device'

    def get_room_name(self, obj):
        try: return obj.device.room.room_name
        except: return 'Unknown Room'

    class Meta:
        model = Schedule
        fields = '__all__'
