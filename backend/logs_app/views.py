from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ActivityLog
from .serializers import ActivityLogSerializer


class LogListView(APIView):
    def get(self, request):
        logs = ActivityLog.objects.all()
        return Response(ActivityLogSerializer(logs, many=True).data)


class LogByDeviceView(APIView):
    def get(self, request, device_id):
        logs = ActivityLog.objects.filter(device_id=device_id)
        return Response(ActivityLogSerializer(logs, many=True).data)


class LogByUserView(APIView):
    def get(self, request, user_id):
        logs = ActivityLog.objects.filter(user_id=user_id)
        return Response(ActivityLogSerializer(logs, many=True).data)
