from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Floor, Room, UserRoomPermission
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
        floors = Floor.objects.all().order_by('level', 'floor_id')
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
                category='floor',
                action='floor_created',
                details=f'Tạo tầng "{floor.floor_name}" (level {floor.level})',
                metadata={'floor_id': floor.floor_id},
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
        before_level = floor.level
        serializer = FloorSerializer(floor, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            create_activity_log(
                request=request,
                category='floor',
                action='floor_updated',
                details=(
                    f'Cập nhật tầng "{before_name}" → "{updated.floor_name}" '
                    f'(level {before_level} → {updated.level})'
                ),
                metadata={'floor_id': updated.floor_id},
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
            category='floor',
            action='floor_deleted',
            details=f'Xóa tầng "{floor.floor_name}"',
            metadata={'floor_id': floor.floor_id},
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
                category='room',
                action='room_created',
                details=f'Tạo phòng "{room.room_name}" thuộc tầng "{room.floor.floor_name}"',
                metadata={'room_id': room.room_id, 'floor_id': room.floor_id},
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
                category='room',
                action='room_updated',
                details=(
                    f'Cập nhật phòng "{before_name}" → "{updated.room_name}" '
                    f'(tầng {before_floor} → {updated.floor.floor_name})'
                ),
                metadata={'room_id': updated.room_id, 'floor_id': updated.floor_id},
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
            category='room',
            action='room_deleted',
            details=f'Xóa phòng "{room.room_name}" thuộc tầng "{room.floor.floor_name}"',
            metadata={'room_id': room.room_id, 'floor_id': room.floor_id},
        )
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
        _, error = _require_admin(request)
        if error:
            return error
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
        create_activity_log(
            request=request,
            category='user',
            action='permissions_updated',
            details=f'Cập nhật quyền phòng cho user "{user.username}" ({len(room_ids)} phòng)',
            metadata={'target_user_id': user.user_id, 'room_ids': room_ids},
        )
        perms = UserRoomPermission.objects.filter(user=user).select_related('room')
        data = [
            {'room_id': p.room.room_id, 'room_name': p.room.room_name, 'floor_id': p.room.floor_id}
            for p in perms
        ]
        return Response(data)
