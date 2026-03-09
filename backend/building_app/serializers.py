from rest_framework import serializers
from .models import Floor, Room


class FloorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Floor
        fields = ['floor_id', 'floor_name', 'user_id']
        read_only_fields = ['floor_id']


class RoomSerializer(serializers.ModelSerializer):
    floor_name = serializers.CharField(source='floor_id.floor_name', read_only=True)
    
    class Meta:
        model = Room
        fields = ['room_id', 'room_name', 'floor_id', 'floor_name', 'user_id']
        read_only_fields = ['room_id', 'floor_name']
