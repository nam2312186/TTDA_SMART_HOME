from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Schedule
from .serializers import ScheduleSerializer


class ScheduleListView(APIView):
    def get(self, request):
        schedules = Schedule.objects.all()
        return Response(ScheduleSerializer(schedules, many=True).data)

    def post(self, request):
        serializer = ScheduleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ScheduleDetailView(APIView):
    def get(self, request, pk):
        schedule = get_object_or_404(Schedule, pk=pk)
        return Response(ScheduleSerializer(schedule).data)

    def put(self, request, pk):
        schedule = get_object_or_404(Schedule, pk=pk)
        serializer = ScheduleSerializer(schedule, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        schedule = get_object_or_404(Schedule, pk=pk)
        schedule.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
