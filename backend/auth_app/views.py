from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from users_app.models import User
from users_app.serializers import UserSerializer
from .serializers import RegisterSerializer, LoginSerializer
from django.contrib.auth.hashers import check_password


class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'User created'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        try:
            from django.db.models import Q
            user = User.objects.get(Q(username=username) | Q(email=username))
            if check_password(password, user.password):
                return Response({
                    'message': 'Login success',
                    'user_id': user.user_id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role_id.role_name if user.role_id else None,
                })
        except User.DoesNotExist:
            pass
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    def post(self, request):
        return Response({'message': 'Logged out'})


class MeView(APIView):
    def get(self, request):
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({'error': 'user_id required'}, status=status.HTTP_400_BAD_REQUEST)
        from django.shortcuts import get_object_or_404
        user = get_object_or_404(User, pk=user_id)
        return Response(UserSerializer(user).data)