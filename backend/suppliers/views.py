from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics

from accounts.permissions import IsAdminRole

from .models import Supplier, SupplierLedger
from .serializers import SupplierLedgerSerializer, SupplierSerializer


class SupplierListCreateView(generics.ListCreateAPIView):
    serializer_class = SupplierSerializer
    permission_classes = [IsAdminRole]
    queryset = Supplier.objects.all()


class SupplierDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SupplierSerializer
    permission_classes = [IsAdminRole]
    queryset = Supplier.objects.all()


@extend_schema_view(get=extend_schema(parameters=[OpenApiParameter("supplier", int, description="Filter by supplier id")]))
class SupplierLedgerListCreateView(generics.ListCreateAPIView):
    serializer_class = SupplierLedgerSerializer
    permission_classes = [IsAdminRole]
    queryset = SupplierLedger.objects.select_related("supplier", "created_by")

    def get_queryset(self):
        qs = super().get_queryset()
        supplier = self.request.query_params.get("supplier")
        return qs.filter(supplier_id=supplier) if supplier else qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
