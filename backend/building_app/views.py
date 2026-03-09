from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Floor, Room
from .serializers import FloorSerializer, RoomSerializer


# ── Floors ────────────────────────────────────────────────────────────────────

class FloorListView(APIView):
    def get(self, request):
        floors = Floor.objects.all()
        serializer = FloorSerializer(floors, many=True)
        return Response(serializer.data)


class FloorDetailView(APIView):
    def get(self, request, id):
        floor = get_object_or_404(Floor, floor_id=id)
        serializer = FloorSerializer(floor)
        return Response(serializer.data)


class FloorRoomsView(APIView):
    def get(self, request, id):
        """Lấy phòng theo tầng: /api/floors/{id}/rooms"""
        floor = get_object_or_404(Floor, floor_id=id)
        rooms = Room.objects.filter(floor_id=floor)
        serializer = RoomSerializer(rooms, many=True)
        return Response({
            'floor_id': floor.floor_id,
            'floor_name': floor.floor_name,
            'count': rooms.count(),
            'rooms': serializer.data
        })


# ── Rooms ─────────────────────────────────────────────────────────────────────

class RoomListView(APIView):
    def get(self, request):
        rooms = Room.objects.all()
        serializer = RoomSerializer(rooms, many=True)
        return Response(serializer.data)


class RoomDetailView(APIView):
    def get(self, request, id):
        room = get_object_or_404(Room, room_id=id)
        serializer = RoomSerializer(room)
        return Response(serializer.data)
