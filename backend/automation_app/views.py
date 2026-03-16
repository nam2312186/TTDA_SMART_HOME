from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from logs_app.utils import create_activity_log

from .models import Schedule
from .serializers import ScheduleSerializer


class ScheduleListView(APIView):
    def get(self, request):
        schedules = Schedule.objects.select_related('device', 'device__room').all()
        return Response(ScheduleSerializer(schedules, many=True).data)

    def post(self, request):
        serializer = ScheduleSerializer(data=request.data)
        if serializer.is_valid():
            schedule = serializer.save()
            create_activity_log(
                request=request,
                device=schedule.device,
                action='schedule_created',
                details=f'Created schedule #{schedule.schedule_id} for {schedule.device.device_name}',
            )
            return Response(ScheduleSerializer(schedule).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ScheduleDetailView(APIView):
    def get(self, request, pk):
        schedule = get_object_or_404(Schedule.objects.select_related('device', 'device__room'), pk=pk)
        return Response(ScheduleSerializer(schedule).data)

    def put(self, request, pk):
        schedule = get_object_or_404(Schedule, pk=pk)
        serializer = ScheduleSerializer(schedule, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            create_activity_log(
                request=request,
                device=updated.device,
                action='schedule_updated',
                details=f'Updated schedule #{updated.schedule_id}',
            )
            return Response(ScheduleSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        schedule = get_object_or_404(Schedule, pk=pk)
        create_activity_log(
            request=request,
            device=schedule.device,
            action='schedule_deleted',
            details=f'Deleted schedule #{schedule.schedule_id}',
        )
        schedule.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)