from django.urls import path
from .views import (
    IoTPushView, IoTPushBatchView,
    IoTTokenListView, IoTTokenDetailView, IoTTokenRegenerateView,
)

urlpatterns = [
    # IoT device gọi để đẩy dữ liệu lên
    path('iot/push/', IoTPushView.as_view()),
    path('iot/push/batch/', IoTPushBatchView.as_view()),

    # Quản lý token (admin dùng)
    path('iot/tokens/', IoTTokenListView.as_view()),
    path('iot/tokens/<int:pk>/', IoTTokenDetailView.as_view()),
    path('iot/tokens/<int:pk>/regenerate/', IoTTokenRegenerateView.as_view()),
]
