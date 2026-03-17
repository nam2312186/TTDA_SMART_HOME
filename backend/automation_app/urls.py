from django.urls import path
from .views import (
    ScheduleListView, ScheduleDetailView,
    AutomationRuleListView, AutomationRuleDetailView,
    IsMonitorListView,
)

urlpatterns = [
    path('schedules/', ScheduleListView.as_view()),
    path('schedules/<int:pk>/', ScheduleDetailView.as_view()),
    path('automation-rules/', AutomationRuleListView.as_view()),
    path('automation-rules/<int:pk>/', AutomationRuleDetailView.as_view()),
    path('is-monitor/', IsMonitorListView.as_view()),
]
