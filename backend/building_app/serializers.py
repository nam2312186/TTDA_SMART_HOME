from rest_framework import serializers
from .models import Floor, Room, RoomManagement


class FloorSerializer(serializers.ModelSerializer):
    room_count = serializers.SerializerMethodField()

    def get_room_count(self, obj):
        return obj.rooms.count()

    class Meta:
        model = Floor
        fields = '__all__'


class RoomSerializer(serializers.ModelSerializer):
    device_count = serializers.SerializerMethodField()
    floor_name = serializers.SerializerMethodField()

    def get_device_count(self, obj):
        return obj.devices.count()

    def get_floor_name(self, obj):
        return obj.floor.floor_name if obj.floor else None

    class Meta:
        model = Room
        fields = '__all__'


class RoomManagementSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomManagement
        fields = '__all__'
