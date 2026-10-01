from rest_framework import serializers

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "description", "product_count"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    is_low_stock = serializers.BooleanField(read_only=True)
    barcode = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)

    class Meta:
        model = Product
        fields = [
            "id", "name", "category", "category_name", "sku", "barcode",
            "purchase_price", "selling_price", "stock", "reorder_level",
            "active", "is_low_stock", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_category_name(self, obj) -> str | None:
        return obj.category.name if obj.category_id else None

    def validate_barcode(self, value):
        value = (value or "").strip() or None
        if value:
            qs = Product.objects.filter(barcode=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("A product with this barcode already exists.")
        return value
