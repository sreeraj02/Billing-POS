from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def api_root(request):
    return JsonResponse(
        {
            "name": "POS Billing Software API",
            "docs": request.build_absolute_uri("/api/docs/"),
            "schema": request.build_absolute_uri("/api/schema/"),
        }
    )


urlpatterns = [
    path("", api_root),
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/inventory/", include("inventory.urls")),
    path("api/suppliers/", include("suppliers.urls")),
    path("api/sales/", include("sales.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
