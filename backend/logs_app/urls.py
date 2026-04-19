from django.urls import path
from .views import LogListView, LogByDeviceView, LogByUserView

urlpatterns = [
    path('logs/', LogListView.as_view()),
    path('logs/device/<int:device_id>/', LogByDeviceView.as_view()),
    path('logs/user/<int:user_id>/', LogByUserView.as_view()),
]
