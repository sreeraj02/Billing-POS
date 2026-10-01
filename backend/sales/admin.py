from django.contrib import admin

from .models import Return, ReturnItem, Sale, SaleItem, SalesLedger


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "customer_name", "total", "payment_method", "created_by", "created_at")
    list_filter = ("payment_method",)
    search_fields = ("invoice_number", "customer_name", "customer_phone")
    inlines = [SaleItemInline]


class ReturnItemInline(admin.TabularInline):
    model = ReturnItem
    extra = 0


@admin.register(Return)
class ReturnAdmin(admin.ModelAdmin):
    list_display = ("id", "sale", "total", "created_by", "created_at")
    inlines = [ReturnItemInline]


@admin.register(SalesLedger)
class SalesLedgerAdmin(admin.ModelAdmin):
    list_display = ("description", "entry_type", "debit", "credit", "created_at")
    list_filter = ("entry_type",)
