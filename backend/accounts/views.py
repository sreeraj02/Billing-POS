from django.db.models import ProtectedError
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .permissions import IsAdminRole
from .serializers import LoginSerializer, StaffSerializer, UserSerializer


class LoginView(TokenObtainPairView):
    """Exchange username/password for `access` + `refresh` JWT tokens and the user profile."""

    serializer_class = LoginSerializer


class MeView(generics.RetrieveAPIView):
    """The currently authenticated user."""

    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class StaffListCreateView(generics.ListCreateAPIView):
    serializer_class = StaffSerializer
    permission_classes = [IsAdminRole]
    queryset = User.objects.filter(role=User.Role.STAFF, is_superuser=False).order_by("-date_joined")


class StaffDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StaffSerializer
    permission_classes = [IsAdminRole]
    queryset = User.objects.filter(role=User.Role.STAFF, is_superuser=False)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        try:
            user.delete()
        except ProtectedError:
            # Staff who created bills must be kept for the audit trail: deactivate instead.
            user.is_active = False
            user.save(update_fields=["is_active"])
            return Response(
                {"detail": "This staff member has billing history, so the account was deactivated instead of deleted."},
                status=status.HTTP_200_OK,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
