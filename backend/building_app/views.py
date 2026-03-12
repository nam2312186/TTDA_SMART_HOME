from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Floor, Room, UserRoomPermission
from .serializers import FloorSerializer, RoomSerializer
from users_app.models import User


class FloorListView(APIView):
    def get(self, request):
        floors = Floor.objects.all().order_by('level', 'floor_id')
        return Response(FloorSerializer(floors, many=True).data)

    def post(self, request):
        serializer = FloorSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FloorDetailView(APIView):
    def get(self, request, pk):
        floor = get_object_or_404(Floor, pk=pk)
        return Response(FloorSerializer(floor).data)

    def put(self, request, pk):
        floor = get_object_or_404(Floor, pk=pk)
        serializer = FloorSerializer(floor, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        floor = get_object_or_404(Floor, pk=pk)
        floor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoomListView(APIView):
    def get(self, request):
        rooms = Room.objects.all()
        return Response(RoomSerializer(rooms, many=True).data)

    def post(self, request):
        serializer = RoomSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RoomDetailView(APIView):
    def get(self, request, pk):
        room = get_object_or_404(Room, pk=pk)
        return Response(RoomSerializer(room).data)

    def put(self, request, pk):
        room = get_object_or_404(Room, pk=pk)
        serializer = RoomSerializer(room, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        room = get_object_or_404(Room, pk=pk)
        room.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FloorRoomsView(APIView):
    def get(self, request, floor_id):
        rooms = Room.objects.filter(floor_id=floor_id)
        return Response(RoomSerializer(rooms, many=True).data)


class UserRoomPermissionView(APIView):
    """
    GET  /api/users/<user_id>/room-permissions/  → list room IDs the user has access to
    POST /api/users/<user_id>/room-permissions/  → set (replace) full list of permitted room IDs
    """
    def get(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        perms = UserRoomPermission.objects.filter(user=user).select_related('room')
        data = [
            {'room_id': p.room.room_id, 'room_name': p.room.room_name, 'floor_id': p.room.floor_id}
            for p in perms
        ]
        return Response(data)

    def post(self, request, user_id):
        """Replace the user's room permissions with the provided list of room_ids."""
        user = get_object_or_404(User, pk=user_id)
        room_ids = request.data.get('room_ids', [])
        if not isinstance(room_ids, list):
            return Response({'error': 'room_ids must be a list'}, status=status.HTTP_400_BAD_REQUEST)
        # Delete existing and create new ones
        UserRoomPermission.objects.filter(user=user).delete()
        for rid in room_ids:
            room = Room.objects.filter(pk=rid).first()
            if room:
                UserRoomPermission.objects.get_or_create(user=user, room=room)
        perms = UserRoomPermission.objects.filter(user=user).select_related('room')
        data = [
            {'room_id': p.room.room_id, 'room_name': p.room.room_name, 'floor_id': p.room.floor_id}
            for p in perms
        ]
        return Response(data)
