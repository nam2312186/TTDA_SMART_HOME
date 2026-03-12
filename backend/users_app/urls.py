from django.urls import path
from .views import UserListView, UserDetailView, RoleListView, AssignManagerView

urlpatterns = [
    path('users/', UserListView.as_view()),
    path('users/<int:pk>/', UserDetailView.as_view()),
    path('roles/', RoleListView.as_view()),
    path('admin/assign-manager/', AssignManagerView.as_view()),
]