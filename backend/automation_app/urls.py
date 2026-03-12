from django.urls import path
from .views import ScheduleListView, ScheduleDetailView

urlpatterns = [
    path('schedules/', ScheduleListView.as_view()),
    path('schedules/<int:pk>/', ScheduleDetailView.as_view()),
]
