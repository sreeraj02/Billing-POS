from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminRole
from inventory.models import Product

from . import services
from .models import Return, Sale, SaleItem, SalesLedger
from .serializers import (
    CheckoutSerializer,
    ReturnCreateSerializer,
    ReturnSerializer,
    SaleDetailSerializer,
    SaleListSerializer,
    SalesLedgerSerializer,
)

User = get_user_model()

DATE_PARAMS = [
    OpenApiParameter("date_from", OpenApiTypes.DATE, description="YYYY-MM-DD (inclusive)"),
    OpenApiParameter("date_to", OpenApiTypes.DATE, description="YYYY-MM-DD (inclusive)"),
]


def apply_date_range(qs, params, field="created_at"):
    date_from = parse_date(params.get("date_from") or "")
    date_to = parse_date(params.get("date_to") or "")
    if date_from:
        qs = qs.filter(**{f"{field}__date__gte": date_from})
    if date_to:
        qs = qs.filter(**{f"{field}__date__lte": date_to})
    return qs


def num(value) -> float:
    return float(value or 0)


# ---------------------------------------------------------------- checkout & bills
class CheckoutView(APIView):
    """Create a bill. Validates stock, reduces stock and writes the ledger inside one transaction."""

    @extend_schema(request=CheckoutSerializer, responses={201: SaleDetailSerializer})
    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale = services.checkout(request.user, serializer.validated_data)
        return Response(SaleDetailSerializer(sale).data, status=status.HTTP_201_CREATED)


class BillsMixin:
    """Admins see every bill; staff only see the bills they created."""

    queryset = Sale.objects.all()

    def get_queryset(self):
        qs = services.sale_queryset()
        if not self.request.user.is_admin_role:
            qs = qs.filter(created_by=self.request.user)
        return qs


@extend_schema_view(
    get=extend_schema(
        parameters=[
            OpenApiParameter("search", str, description="Invoice number, customer name or phone"),
            OpenApiParameter("payment_method", str),
            *DATE_PARAMS,
        ]
    )
)
class BillListView(BillsMixin, generics.ListAPIView):
    serializer_class = SaleListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        search = params.get("search")
        if search:
            qs = qs.filter(
                Q(invoice_number__icontains=search) | Q(customer_name__icontains=search) | Q(customer_phone__icontains=search)
            )
        if params.get("payment_method"):
            qs = qs.filter(payment_method=params["payment_method"])
        return apply_date_range(qs, params)


class BillDetailView(BillsMixin, generics.RetrieveAPIView):
    serializer_class = SaleDetailSerializer



class ReturnListView(generics.ListAPIView):
    serializer_class = ReturnSerializer
    permission_classes = [IsAdminRole]
    queryset = Return.objects.select_related("sale", "created_by").prefetch_related("items__product")


class ReturnCreateView(APIView):
    """Return products from an existing bill. Restores stock and writes a ledger entry."""

    permission_classes = [IsAdminRole]

    @extend_schema(request=ReturnCreateSerializer, responses={201: ReturnSerializer})
    def post(self, request):
        serializer = ReturnCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale_return = services.create_return(request.user, serializer.validated_data)
        return Response(ReturnSerializer(sale_return).data, status=status.HTTP_201_CREATED)



@extend_schema_view(
    get=extend_schema(parameters=[OpenApiParameter("entry_type", str, description="SALE or RETURN"), *DATE_PARAMS])
)
class SalesLedgerListView(generics.ListAPIView):
    serializer_class = SalesLedgerSerializer
    permission_classes = [IsAdminRole]
    queryset = SalesLedger.objects.select_related("sale")

    def get_queryset(self):
        qs = super().get_queryset()
        entry_type = self.request.query_params.get("entry_type")
        if entry_type in SalesLedger.EntryType.values:
            qs = qs.filter(entry_type=entry_type)
        return apply_date_range(qs, self.request.query_params)



class SalesReportView(APIView):
    permission_classes = [IsAdminRole]

    @extend_schema(parameters=DATE_PARAMS, responses=OpenApiTypes.OBJECT)
    def get(self, request):
        sales = apply_date_range(Sale.objects.all(), request.query_params)
        returns = apply_date_range(Return.objects.all(), request.query_params)

        totals = sales.aggregate(bills=Count("id"), sales=Sum("total"), discounts=Sum("discount"))
        return_totals = returns.aggregate(count=Count("id"), amount=Sum("total"))
        total_bills = totals["bills"] or 0
        total_sales = num(totals["sales"])

        by_payment = (
            sales.values("payment_method").annotate(bills=Count("id"), amount=Sum("total")).order_by("-amount")
        )
        top_products = (
            SaleItem.objects.filter(sale__in=sales)
            .values("product_id", "product_name")
            .annotate(quantity=Sum("quantity"), revenue=Sum("line_total"))
            .order_by("-quantity")[:5]
        )
        daily = (
            sales.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(bills=Count("id"), amount=Sum("total"))
            .order_by("day")
        )
        return Response(
            {
                "total_bills": total_bills,
                "total_sales": total_sales,
                "total_discounts": num(totals["discounts"]),
                "average_bill_value": round(total_sales / total_bills, 2) if total_bills else 0,
                "total_returns": num(return_totals["amount"]),
                "return_count": return_totals["count"] or 0,
                "net_sales": total_sales - num(return_totals["amount"]),
                "by_payment_method": [
                    {"payment_method": r["payment_method"], "bills": r["bills"], "amount": num(r["amount"])} for r in by_payment
                ],
                "top_products": [
                    {"product_id": r["product_id"], "name": r["product_name"], "quantity": r["quantity"], "revenue": num(r["revenue"])}
                    for r in top_products
                ],
                "daily_sales": [{"date": r["day"].isoformat(), "bills": r["bills"], "amount": num(r["amount"])} for r in daily],
            }
        )


class DashboardView(APIView):
    permission_classes = [IsAdminRole]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        today = timezone.localdate()
        today_sales = Sale.objects.filter(created_at__date=today)
        today_totals = today_sales.aggregate(bills=Count("id"), amount=Sum("total"))
        today_returns = Return.objects.filter(created_at__date=today).aggregate(amount=Sum("total"))

        low_stock = Product.objects.filter(active=True, stock__lte=F("reorder_level")).order_by("stock")
        stock_value = Product.objects.aggregate(
            value=Sum(ExpressionWrapper(F("stock") * F("purchase_price"), output_field=DecimalField(max_digits=16, decimal_places=2)))
        )

        week_start = today - timedelta(days=6)
        week_rows = {
            r["day"]: r
            for r in Sale.objects.filter(created_at__date__gte=week_start)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(bills=Count("id"), amount=Sum("total"))
        }
        last_7_days = []
        for offset in range(7):
            day = week_start + timedelta(days=offset)
            row = week_rows.get(day)
            last_7_days.append({"date": day.isoformat(), "bills": row["bills"] if row else 0, "amount": num(row["amount"]) if row else 0})

        recent = services.sale_queryset()[:5]
        return Response(
            {
                "today_sales": num(today_totals["amount"]),
                "today_bills": today_totals["bills"] or 0,
                "today_returns": num(today_returns["amount"]),
                "total_products": Product.objects.count(),
                "active_products": Product.objects.filter(active=True).count(),
                "low_stock_count": low_stock.count(),
                "out_of_stock_count": Product.objects.filter(active=True, stock=0).count(),
                "inventory_value": num(stock_value["value"]),
                "total_staff": User.objects.filter(role="STAFF", is_active=True).count(),
                "low_stock_products": [
                    {"id": p.id, "name": p.name, "sku": p.sku, "stock": p.stock, "reorder_level": p.reorder_level}
                    for p in low_stock[:10]
                ],
                "recent_bills": SaleListSerializer(recent, many=True).data,
                "last_7_days": last_7_days,
            }
        )
