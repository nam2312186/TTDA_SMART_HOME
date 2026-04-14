from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from logs_app.utils import create_activity_log
from users_app.models import User
from building_app.models import RoomManagement

from .models import Schedule, AutomationRule, IsMonitor
from .serializers import ScheduleSerializer, AutomationRuleSerializer, IsMonitorSerializer


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


def _can_access_room(user, room_id):
    if _is_admin(user):
        return True
    return RoomManagement.objects.filter(user=user, room_id=room_id).exists()


class ScheduleListView(APIView):
    def get(self, request):
        user, error = _require_authenticated(request)
        if error:
            return error

        schedules = Schedule.objects.select_related('room', 'room__floor').all()
        if not _is_admin(user):
            allowed_room_ids = RoomManagement.objects.filter(user=user).values_list('room_id', flat=True)
            schedules = schedules.filter(room_id__in=allowed_room_ids)

        return Response(ScheduleSerializer(schedules, many=True).data)

    def post(self, request):
        user, error = _require_authenticated(request)
        if error:
            return error

        room_id = request.data.get('room')
        if room_id and not _can_access_room(user, room_id):
            return Response({'error': 'Permission denied for this room'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ScheduleSerializer(data=request.data)
        if serializer.is_valid():
            schedule = serializer.save()
            create_activity_log(
                request=request,
                action='schedule_created',
                details=f'Created schedule #{schedule.schedule_id} for room {schedule.room.room_name if schedule.room else "N/A"}',
            )
            return Response(ScheduleSerializer(schedule).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ScheduleDetailView(APIView):
    def get(self, request, pk):
        user, error = _require_authenticated(request)
        if error:
            return error

        schedule = get_object_or_404(Schedule.objects.select_related('room', 'room__floor'), pk=pk)
        if schedule.room_id and not _can_access_room(user, schedule.room_id):
            return Response({'error': 'Permission denied for this schedule'}, status=status.HTTP_403_FORBIDDEN)

        return Response(ScheduleSerializer(schedule).data)

    def put(self, request, pk):
        user, error = _require_authenticated(request)
        if error:
            return error

        schedule = get_object_or_404(Schedule, pk=pk)
        if schedule.room_id and not _can_access_room(user, schedule.room_id):
            return Response({'error': 'Permission denied for this schedule'}, status=status.HTTP_403_FORBIDDEN)

        target_room_id = request.data.get('room', schedule.room_id)
        if target_room_id and not _can_access_room(user, target_room_id):
            return Response({'error': 'Permission denied for target room'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ScheduleSerializer(schedule, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            create_activity_log(
                request=request,
                action='schedule_updated',
                details=f'Updated schedule #{updated.schedule_id}',
            )
            return Response(ScheduleSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        user, error = _require_authenticated(request)
        if error:
            return error

        schedule = get_object_or_404(Schedule, pk=pk)
        if schedule.room_id and not _can_access_room(user, schedule.room_id):
            return Response({'error': 'Permission denied for this schedule'}, status=status.HTTP_403_FORBIDDEN)

        create_activity_log(
            request=request,
            action='schedule_deleted',
            details=f'Deleted schedule #{schedule.schedule_id}',
        )
        schedule.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AutomationRuleListView(APIView):
    def get(self, request):
        rules = AutomationRule.objects.select_related('threshold').all()
        return Response(AutomationRuleSerializer(rules, many=True).data)

    def post(self, request):
        serializer = AutomationRuleSerializer(data=request.data)
        if serializer.is_valid():
            rule = serializer.save()
            return Response(AutomationRuleSerializer(rule).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AutomationRuleDetailView(APIView):
    def get(self, request, pk):
        rule = get_object_or_404(AutomationRule, pk=pk)
        return Response(AutomationRuleSerializer(rule).data)

    def put(self, request, pk):
        rule = get_object_or_404(AutomationRule, pk=pk)
        serializer = AutomationRuleSerializer(rule, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        rule = get_object_or_404(AutomationRule, pk=pk)
        rule.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class IsMonitorListView(APIView):
    def get(self, request):
        monitors = IsMonitor.objects.select_related('device', 'rule').all()
        return Response(IsMonitorSerializer(monitors, many=True).data)

    def post(self, request):
        serializer = IsMonitorSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        device_id = request.data.get('device')
        rule_id = request.data.get('rule')
        monitor = get_object_or_404(IsMonitor, device_id=device_id, rule_id=rule_id)
        monitor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)