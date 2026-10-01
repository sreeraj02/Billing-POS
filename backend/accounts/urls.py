from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("login/", views.LoginView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", views.MeView.as_view(), name="me"),
    path("staff/", views.StaffListCreateView.as_view(), name="staff-list"),
    path("staff/<int:pk>/", views.StaffDetailView.as_view(), name="staff-detail"),
]
