from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from users_app.models import User
from building_app.models import RoomManagement
from .models import ActivityLog
from .serializers import ActivityLogSerializer


def _resolve_request_user(request):
    raw_uid = request.headers.get('X-User-Id')
    if not raw_uid:
        return None
    try:
        return User.objects.select_related('role_id').filter(pk=int(raw_uid)).first()
    except (TypeError, ValueError):
        return None


def _is_admin(user):
    return bool(user and user.role_id and user.role_id.role_name == 'admin')


def _require_authenticated(request):
    user = _resolve_request_user(request)
    if not user:
        return None, Response({'error': 'X-User-Id is required'}, status=status.HTTP_401_UNAUTHORIZED)
    return user, None


class LogListView(APIView):
    def get(self, request):
        user, error = _require_authenticated(request)
        if error:
            return error

        logs = ActivityLog.objects.select_related('user', 'device', 'device__room', 'device__room__floor').all()
        if not _is_admin(user):
            allowed_room_ids = RoomManagement.objects.filter(user=user).values_list('room_id', flat=True)
            logs = logs.filter(device__room_id__in=allowed_room_ids)

        return Response(ActivityLogSerializer(logs, many=True).data)


class LogByDeviceView(APIView):
    def get(self, request, device_id):
        user, error = _require_authenticated(request)
        if error:
            return error

        logs = ActivityLog.objects.select_related('user', 'device', 'device__room', 'device__room__floor').filter(device_id=device_id)
        if not _is_admin(user):
            allowed_room_ids = RoomManagement.objects.filter(user=user).values_list('room_id', flat=True)
            logs = logs.filter(device__room_id__in=allowed_room_ids)

        return Response(ActivityLogSerializer(logs, many=True).data)


class LogByUserView(APIView):
    def get(self, request, user_id):
        user, error = _require_authenticated(request)
        if error:
            return error

        if not _is_admin(user) and user.user_id != user_id:
            return Response({'error': 'Permission denied for this user log'}, status=status.HTTP_403_FORBIDDEN)

        logs = ActivityLog.objects.select_related('user', 'device', 'device__room', 'device__room__floor').filter(user_id=user_id)
        if not _is_admin(user):
            allowed_room_ids = RoomManagement.objects.filter(user=user).values_list('room_id', flat=True)
            logs = logs.filter(device__room_id__in=allowed_room_ids)

        return Response(ActivityLogSerializer(logs, many=True).data)
