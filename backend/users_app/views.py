from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import User, Role
from .serializers import UserSerializer, RoleSerializer
from building_app.models import Room, RoomManagement
from logs_app.utils import create_activity_log


class UserListView(APIView):
    def get(self, request):
        users = User.objects.all()
        return Response(UserSerializer(users, many=True).data)

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDetailView(APIView):
    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        return Response(UserSerializer(user).data)

    def put(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        serializer = UserSerializer(user, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoleListView(APIView):
    def get(self, request):
        roles = Role.objects.all()
        return Response(RoleSerializer(roles, many=True).data)


class AssignManagerView(APIView):
    """Gán user quản lý một phòng cụ thể thông qua room_managements."""
    def post(self, request):
        user_id = request.data.get('user_id')
        room_id = request.data.get('room_id')
        if not user_id or not room_id:
            return Response({'error': 'user_id và room_id là bắt buộc'}, status=status.HTTP_400_BAD_REQUEST)
        user = get_object_or_404(User, pk=user_id)
        room = get_object_or_404(Room, pk=room_id)
        _, created = RoomManagement.objects.get_or_create(user=user, room=room)
        if created:
            create_activity_log(
                request=request,
                action='room_permission_assigned',
                details=f'Assigned user "{user.username}" to room "{room.room_name}"',
            )
        return Response({'message': f'Gán {user.username} quản lý phòng {room.room_name}'})


class UserRoomPermissionsView(APIView):
    """GET/POST user room permissions based on room_managements."""

    def get(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        permissions = (
            RoomManagement.objects
            .select_related('room', 'room__floor')
            .filter(user=user)
            .order_by('room__room_id')
        )
        return Response([
            {
                'room_id': perm.room.room_id,
                'room_name': perm.room.room_name,
                'floor_id': perm.room.floor.floor_id if perm.room.floor else None,
            }
            for perm in permissions
        ])

    def post(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        room_ids = request.data.get('room_ids', [])
        if not isinstance(room_ids, list):
            return Response({'error': 'room_ids phải là array'}, status=status.HTTP_400_BAD_REQUEST)

        rooms = Room.objects.filter(room_id__in=room_ids)
        found_ids = {room.room_id for room in rooms}
        missing_ids = [rid for rid in room_ids if rid not in found_ids]
        if missing_ids:
            return Response(
                {'error': f'Không tìm thấy room_id: {missing_ids}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            previous_room_ids = set(
                RoomManagement.objects.filter(user=user).values_list('room_id', flat=True)
            )
            previous_rooms = {
                room.room_id: room.room_name
                for room in Room.objects.filter(room_id__in=previous_room_ids)
            }
            RoomManagement.objects.filter(user=user).exclude(room_id__in=room_ids).delete()
            for room in rooms:
                RoomManagement.objects.get_or_create(user=user, room=room)

        current_room_ids = set(
            RoomManagement.objects.filter(user=user).values_list('room_id', flat=True)
        )
        added = sorted(current_room_ids - previous_room_ids)
        removed = sorted(previous_room_ids - current_room_ids)
        selected_rooms = {room.room_id: room.room_name for room in rooms}
        added_names = [selected_rooms.get(room_id, str(room_id)) for room_id in added]
        removed_names = [previous_rooms.get(room_id, str(room_id)) for room_id in removed]
        detail_segments = [f'Updated room permissions for "{user.username}".']
        if added_names:
            added_text = ', '.join([f'"{name}"' for name in added_names])
            detail_segments.append(f'Added rooms: {added_text}.')
        if removed_names:
            removed_text = ', '.join([f'"{name}"' for name in removed_names])
            detail_segments.append(f'Removed rooms: {removed_text}.')
        create_activity_log(
            request=request,
            action='room_permissions_updated',
            details=' '.join(detail_segments),
        )

        updated = (
            RoomManagement.objects
            .select_related('room', 'room__floor')
            .filter(user=user)
            .order_by('room__room_id')
        )
        return Response([
            {
                'room_id': perm.room.room_id,
                'room_name': perm.room.room_name,
                'floor_id': perm.room.floor.floor_id if perm.room.floor else None,
            }
            for perm in updated
        ])
    