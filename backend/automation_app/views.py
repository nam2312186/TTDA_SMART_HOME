from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from logs_app.utils import create_activity_log

from .models import Schedule, AutomationRule, IsMonitor
from .serializers import ScheduleSerializer, AutomationRuleSerializer, IsMonitorSerializer


class ScheduleListView(APIView):
    def get(self, request):
        schedules = Schedule.objects.select_related('room', 'room__floor').all()
        return Response(ScheduleSerializer(schedules, many=True).data)

    def post(self, request):
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
        schedule = get_object_or_404(Schedule.objects.select_related('room', 'room__floor'), pk=pk)
        return Response(ScheduleSerializer(schedule).data)

    def put(self, request, pk):
        schedule = get_object_or_404(Schedule, pk=pk)
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
        schedule = get_object_or_404(Schedule, pk=pk)
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