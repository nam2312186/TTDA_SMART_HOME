from django.urls import path
from .views import ActivityLogListView, DeviceLogsView, UserLogsView

urlpatterns = [
    path('logs/', ActivityLogListView.as_view(), name='log-list'),
    path('logs/device/<int:id>/', DeviceLogsView.as_view(), name='log-by-device'),
    path('logs/user/<int:id>/', UserLogsView.as_view(), name='log-by-user'),
]
