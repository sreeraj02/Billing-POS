from django.db.models import Count, F, ProtectedError, Q
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.response import Response

from accounts.permissions import IsAdminOrReadOnly

from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


class CategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    queryset = Category.objects.annotate(product_count=Count("products"))


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    queryset = Category.objects.annotate(product_count=Count("products"))


@extend_schema_view(
    get=extend_schema(
        parameters=[
            OpenApiParameter("search", str, description="Match on name, SKU or barcode"),
            OpenApiParameter("category", int, description="Category id"),
            OpenApiParameter("active", bool, description="true / false"),
            OpenApiParameter("low_stock", bool, description="true = stock <= reorder level"),
        ]
    )
)
class ProductListCreateView(generics.ListCreateAPIView):
    """Any signed-in user can list products (needed by billing); only admins can create."""

    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    queryset = Product.objects.select_related("category")

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        search = params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(sku__icontains=search) | Q(barcode__icontains=search))
        if params.get("category"):
            qs = qs.filter(category_id=params["category"])
        if params.get("active") in ("true", "false"):
            qs = qs.filter(active=params["active"] == "true")
        if params.get("low_stock") == "true":
            qs = qs.filter(stock__lte=F("reorder_level"))
        return qs


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    queryset = Product.objects.select_related("category")

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        try:
            product.delete()
        except ProtectedError:
            return Response(
                {"detail": "This product has sales history and cannot be deleted. Mark it inactive instead."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
