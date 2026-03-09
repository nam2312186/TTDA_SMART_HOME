from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ActivityLog
from .serializers import ActivityLogSerializer


# ── Activity Logs ─────────────────────────────────────────────────────────────

class ActivityLogListView(APIView):
    def get(self, request):
        logs = ActivityLog.objects.all().order_by('-action_time')
        serializer = ActivityLogSerializer(logs, many=True)
        return Response(serializer.data)


class DeviceLogsView(APIView):
    def get(self, request, id):
        logs = ActivityLog.objects.filter(device_id=id).order_by('-action_time')
        serializer = ActivityLogSerializer(logs, many=True)
        return Response({
            'device_id': id,
            'count': logs.count(),
            'logs': serializer.data
        })


class UserLogsView(APIView):
    def get(self, request, id):
        logs = ActivityLog.objects.filter(user_id=id).order_by('-action_time')
        serializer = ActivityLogSerializer(logs, many=True)
        return Response({
            'user_id': id,
            'count': logs.count(),
            'logs': serializer.data
        })
