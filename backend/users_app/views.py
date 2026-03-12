from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import User, Role
from .serializers import UserSerializer, RoleSerializer


class UserListView(APIView):
    def get(self, request):
        users = User.objects.all()
        return Response(UserSerializer(users, many=True).data)

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDetailView(APIView):
    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        return Response(UserSerializer(user).data)

    def put(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        serializer = UserSerializer(user, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoleListView(APIView):
    def get(self, request):
        roles = Role.objects.all()
        return Response(RoleSerializer(roles, many=True).data)


class AssignManagerView(APIView):
    """Gán user quản lý một phòng cụ thể."""
    def post(self, request):
        from building_app.models import Room
        user_id = request.data.get('user_id')
        room_id = request.data.get('room_id')
        if not user_id or not room_id:
            return Response({'error': 'user_id và room_id là bắt buộc'}, status=status.HTTP_400_BAD_REQUEST)
        user = get_object_or_404(User, pk=user_id)
        room = get_object_or_404(Room, pk=room_id)
        room.user = user
        room.save()
        return Response({'message': f'Gán {user.username} quản lý phòng {room.room_name}'})
    