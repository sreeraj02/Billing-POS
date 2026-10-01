from django.db.models import Sum
from rest_framework import serializers

from .models import Supplier, SupplierLedger


class SupplierSerializer(serializers.ModelSerializer):
    balance = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = ["id", "name", "phone", "email", "address", "opening_balance", "active", "balance", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_balance(self, obj) -> float:
        """Amount payable to the supplier: opening balance + credits - debits."""
        totals = obj.ledger_entries.aggregate(debit=Sum("debit"), credit=Sum("credit"))
        return float(obj.opening_balance + (totals["credit"] or 0) - (totals["debit"] or 0))


class SupplierLedgerSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True, default=None)

    class Meta:
        model = SupplierLedger
        fields = [
            "id", "supplier", "supplier_name", "description", "debit", "credit",
            "created_by", "created_by_name", "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def validate(self, attrs):
        debit = attrs.get("debit", 0) or 0
        credit = attrs.get("credit", 0) or 0
        if (debit > 0) == (credit > 0):
            raise serializers.ValidationError("Enter either a debit (payment) or a credit (purchase) amount greater than 0.")
        return attrs
