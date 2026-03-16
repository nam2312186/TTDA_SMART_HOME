from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Floor, Room
from .serializers import FloorSerializer, RoomSerializer
from users_app.models import User
from logs_app.utils import create_activity_log


def _resolve_request_user(request):
    raw_uid = request.headers.get('X-User-Id')
    if not raw_uid:
        return None
    try:
        return User.objects.select_related('role_id').filter(pk=int(raw_uid)).first()
    except (TypeError, ValueError):
        return None


def _require_admin(request):
    user = _resolve_request_user(request)
    if not user:
        return None, Response({'error': 'X-User-Id is required'}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.role_id or user.role_id.role_name != 'admin':
        return None, Response({'error': 'Only admin can modify floors/rooms'}, status=status.HTTP_403_FORBIDDEN)
    return user, None


class FloorListView(APIView):
    def get(self, request):
        floors = Floor.objects.all().order_by('floor_id')
        return Response(FloorSerializer(floors, many=True).data)

    def post(self, request):
        admin_user, error = _require_admin(request)
        if error:
            return error
        serializer = FloorSerializer(data=request.data)
        if serializer.is_valid():
            floor = serializer.save(user=admin_user)
            create_activity_log(
                request=request,
                action='floor_created',
                details=f'Created floor "{floor.floor_name}"',
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FloorDetailView(APIView):
    def get(self, request, pk):
        floor = get_object_or_404(Floor, pk=pk)
        return Response(FloorSerializer(floor).data)

    def put(self, request, pk):
        _, error = _require_admin(request)
        if error:
            return error
        floor = get_object_or_404(Floor, pk=pk)
        before_name = floor.floor_name
        serializer = FloorSerializer(floor, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            create_activity_log(
                request=request,
                action='floor_updated',
                details=f'Updated floor "{before_name}" -> "{updated.floor_name}"',
            )
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        _, error = _require_admin(request)
        if error:
            return error
        floor = get_object_or_404(Floor, pk=pk)
        create_activity_log(
            request=request,
            action='floor_deleted',
            details=f'Deleted floor "{floor.floor_name}"',
        )
        floor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoomListView(APIView):
    def get(self, request):
        rooms = Room.objects.all()
        return Response(RoomSerializer(rooms, many=True).data)

    def post(self, request):
        admin_user, error = _require_admin(request)
        if error:
            return error
        serializer = RoomSerializer(data=request.data)
        if serializer.is_valid():
            room = serializer.save(user=admin_user)
            create_activity_log(
                request=request,
                action='room_created',
                details=f'Created room "{room.room_name}" on floor "{room.floor.floor_name}"',
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RoomDetailView(APIView):
    def get(self, request, pk):
        room = get_object_or_404(Room, pk=pk)
        return Response(RoomSerializer(room).data)

    def put(self, request, pk):
        _, error = _require_admin(request)
        if error:
            return error
        room = get_object_or_404(Room, pk=pk)
        before_name = room.room_name
        before_floor = room.floor.floor_name if room.floor else 'N/A'
        serializer = RoomSerializer(room, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            create_activity_log(
                request=request,
                action='room_updated',
                details=f'Updated room "{before_name}" -> "{updated.room_name}" (floor {before_floor} -> {updated.floor.floor_name})',
            )
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        _, error = _require_admin(request)
        if error:
            return error
        room = get_object_or_404(Room, pk=pk)
        create_activity_log(
            request=request,
            action='room_deleted',
            details=f'Deleted room "{room.room_name}" from floor "{room.floor.floor_name}"',
        )
        room.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FloorRoomsView(APIView):
    def get(self, request, floor_id):
        rooms = Room.objects.filter(floor_id=floor_id)
        return Response(RoomSerializer(rooms, many=True).data)
