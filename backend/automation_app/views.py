from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from logs_app.utils import create_activity_log

from .models import Schedule
from .serializers import ScheduleSerializer


class ScheduleListView(APIView):
    def get(self, request):
        schedules = Schedule.objects.select_related('device', 'room', 'device__room').all()
        return Response(ScheduleSerializer(schedules, many=True).data)

    def post(self, request):
        serializer = ScheduleSerializer(data=request.data)
        if serializer.is_valid():
            schedule = serializer.save()
            target_name = schedule.room.room_name if schedule.scope_type == Schedule.SCOPE_ROOM and schedule.room else schedule.device.device_name if schedule.device else 'Unknown'
            create_activity_log(
                request=request,
                device=schedule.device,
                category='schedule',
                action='schedule_created',
                details=f'Tạo lịch "{schedule.name or target_name}" cho {target_name}',
                metadata={
                    'schedule_id': schedule.schedule_id,
                    'scope_type': schedule.scope_type,
                    'device_id': schedule.device_id,
                    'room_id': schedule.room_id,
                    'days_of_week': schedule.days_of_week,
                    'repeat_type': schedule.repeat_type,
                    'action': schedule.action,
                },
            )
            return Response(ScheduleSerializer(schedule).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ScheduleDetailView(APIView):
    def get(self, request, pk):
        schedule = get_object_or_404(Schedule.objects.select_related('device', 'room', 'device__room'), pk=pk)
        return Response(ScheduleSerializer(schedule).data)

    def put(self, request, pk):
        schedule = get_object_or_404(Schedule, pk=pk)
        serializer = ScheduleSerializer(schedule, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            create_activity_log(
                request=request,
                device=updated.device,
                category='schedule',
                action='schedule_updated',
                details=f'Cập nhật lịch #{updated.schedule_id}',
                metadata={
                    'schedule_id': updated.schedule_id,
                    'scope_type': updated.scope_type,
                    'device_id': updated.device_id,
                    'room_id': updated.room_id,
                    'days_of_week': updated.days_of_week,
                    'repeat_type': updated.repeat_type,
                    'action': updated.action,
                    'status': updated.status,
                },
            )
            return Response(ScheduleSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        schedule = get_object_or_404(Schedule, pk=pk)
        create_activity_log(
            request=request,
            device=schedule.device,
            category='schedule',
            action='schedule_deleted',
            details=f'Xóa lịch #{schedule.schedule_id}',
            metadata={
                'schedule_id': schedule.schedule_id,
                'scope_type': schedule.scope_type,
                'device_id': schedule.device_id,
                'room_id': schedule.room_id,
            },
        )
        schedule.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)