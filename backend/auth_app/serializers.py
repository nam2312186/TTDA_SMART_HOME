from rest_framework import serializers
from users_app.models import User
from django.contrib.auth.hashers import make_password, check_password


class RegisterSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        validated_data["password"] = make_password(validated_data["password"])
        # Gán role mặc định 'user' nếu chưa có role nào
        from users_app.models import Role
        default_role, _ = Role.objects.get_or_create(role_name='user')
        validated_data['role_id'] = default_role
        return User.objects.create(**validated_data)


class LoginSerializer(serializers.Serializer):

    username = serializers.CharField()

    password = serializers.CharField()