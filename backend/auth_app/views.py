from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from users_app.models import User
from .serializers import RegisterSerializer, LoginSerializer
from django.contrib.auth.hashers import check_password


class RegisterView(APIView):

    def post(self, request):

        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():

            serializer.save()

            return Response({"message": "User created"})

        return Response(serializer.errors)


class LoginView(APIView):

    def post(self, request):

        serializer = LoginSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]

        password = serializer.validated_data["password"]

        try:

            user = User.objects.get(username=username)

            if check_password(password, user.password):

                return Response({"message": "Login success"})

        except User.DoesNotExist:

            pass

        return Response({"error": "Invalid credentials"})