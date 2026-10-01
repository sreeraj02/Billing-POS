from django.db.models import Sum
from rest_framework import serializers

from .models import Return, ReturnItem, Sale, SaleItem, SalesLedger



class CartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=100000)


class CheckoutSerializer(serializers.Serializer):
    items = CartItemSerializer(many=True, allow_empty=False)
    customer_name = serializers.CharField(required=False, allow_blank=True, max_length=120, default="")
    customer_phone = serializers.CharField(required=False, allow_blank=True, max_length=20, default="")
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False, default=0)
    payment_method = serializers.ChoiceField(choices=Sale.PaymentMethod.choices, default=Sale.PaymentMethod.CASH)
    paid_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False, allow_null=True)


class ReturnCreateSerializer(serializers.Serializer):
    sale_id = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=500)
    items = CartItemSerializer(many=True, allow_empty=False)



class SaleItemSerializer(serializers.ModelSerializer):
    returnable_quantity = serializers.SerializerMethodField()

    class Meta:
        model = SaleItem
        fields = ["id", "product", "product_name", "sku", "quantity", "unit_price", "line_total", "returnable_quantity"]

    def get_returnable_quantity(self, obj) -> int:
        returned = (
            ReturnItem.objects.filter(sale_return__sale_id=obj.sale_id, product_id=obj.product_id)
            .aggregate(qty=Sum("quantity"))["qty"]
            or 0
        )
        return obj.quantity - returned


class SaleListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    change_due = serializers.FloatField(read_only=True)
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id", "invoice_number", "customer_name", "customer_phone", "subtotal", "discount", "total",
            "payment_method", "paid_amount", "change_due", "item_count", "created_by", "created_by_name", "created_at",
        ]

    def get_created_by_name(self, obj) -> str:
        return obj.created_by.get_full_name() or obj.created_by.username


class SaleDetailSerializer(SaleListSerializer):
    items = SaleItemSerializer(many=True, read_only=True)

    class Meta(SaleListSerializer.Meta):
        fields = SaleListSerializer.Meta.fields + ["items"]


class ReturnItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = ReturnItem
        fields = ["id", "product", "product_name", "quantity", "amount"]


class ReturnSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="sale.invoice_number", read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)
    items = ReturnItemSerializer(many=True, read_only=True)

    class Meta:
        model = Return
        fields = ["id", "sale", "invoice_number", "reason", "total", "items", "created_by", "created_by_name", "created_at"]


class SalesLedgerSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="sale.invoice_number", read_only=True)

    class Meta:
        model = SalesLedger
        fields = ["id", "entry_type", "sale", "invoice_number", "description", "debit", "credit", "created_at"]
