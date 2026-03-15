from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ActivityLog
from .serializers import ActivityLogSerializer


class LogListView(APIView):
    def get(self, request):
        logs = ActivityLog.objects.select_related('user', 'device', 'device__room', 'device__room__floor').all()
        category = request.query_params.get('category')
        source = request.query_params.get('source')
        if category:
            logs = logs.filter(category=category)
        if source:
            logs = logs.filter(source=source)
        return Response(ActivityLogSerializer(logs, many=True).data)


class LogByDeviceView(APIView):
    def get(self, request, device_id):
        logs = ActivityLog.objects.select_related('user', 'device', 'device__room', 'device__room__floor').filter(device_id=device_id)
        return Response(ActivityLogSerializer(logs, many=True).data)


class LogByUserView(APIView):
    def get(self, request, user_id):
        logs = ActivityLog.objects.select_related('user', 'device', 'device__room', 'device__room__floor').filter(user_id=user_id)
        return Response(ActivityLogSerializer(logs, many=True).data)
