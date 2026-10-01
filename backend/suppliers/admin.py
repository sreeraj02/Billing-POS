from django.contrib import admin

from .models import Supplier, SupplierLedger


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "email", "opening_balance", "active")
    search_fields = ("name", "phone")


@admin.register(SupplierLedger)
class SupplierLedgerAdmin(admin.ModelAdmin):
    list_display = ("supplier", "description", "debit", "credit", "created_at")
    list_filter = ("supplier",)
