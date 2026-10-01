from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", "full_name",
            "role", "phone", "is_active", "date_joined",
        ]
        read_only_fields = fields

    def get_full_name(self, obj) -> str:
        return obj.get_full_name() or obj.username


class LoginSerializer(TokenObtainPairSerializer):
    """JWT login that also returns the user profile."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class StaffSerializer(serializers.ModelSerializer):
    """Admin-managed staff accounts. The role can never be set from the client."""

    password = serializers.CharField(write_only=True, min_length=6, required=False)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "password", "email", "first_name", "last_name", "full_name",
            "phone", "role", "is_active", "date_joined",
        ]
        read_only_fields = ["id", "role", "date_joined"]

    def get_full_name(self, obj) -> str:
        return obj.get_full_name() or obj.username

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Password is required."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data, role=User.Role.STAFF)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        instance = super().update(instance, validated_data)
        if password:
            instance.set_password(password)
            instance.save(update_fields=["password"])
        return instance
