from django.conf import settings
from django.db import models

from inventory.models import Product


class Sale(models.Model):
    class PaymentMethod(models.TextChoices):
        CASH = "CASH", "Cash"
        CARD = "CARD", "Card"
        UPI = "UPI", "UPI"
        MIXED = "MIXED", "Mixed"

    invoice_number = models.CharField(max_length=32, unique=True, editable=False)
    customer_name = models.CharField(max_length=120, blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=10, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="sales")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    @property
    def change_due(self):
        return self.paid_amount - self.total

    def __str__(self):
        return self.invoice_number


class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="sale_items")
    # Snapshots so old invoices stay correct if the product is renamed or re-priced later.
    product_name = models.CharField(max_length=200)
    sku = models.CharField(max_length=50)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"


class Return(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.PROTECT, related_name="returns")
    reason = models.TextField()
    total = models.DecimalField(max_digits=12, decimal_places=2)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="sale_returns")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"Return #{self.pk} for {self.sale.invoice_number}"


class ReturnItem(models.Model):
    sale_return = models.ForeignKey(Return, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="return_items")
    quantity = models.PositiveIntegerField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.product} x {self.quantity}"


class SalesLedger(models.Model):
    """credit = money received from a sale, debit = money refunded for a return."""

    class EntryType(models.TextChoices):
        SALE = "SALE", "Sale"
        RETURN = "RETURN", "Return"

    entry_type = models.CharField(max_length=10, choices=EntryType.choices)
    sale = models.ForeignKey(Sale, on_delete=models.PROTECT, related_name="ledger_entries")
    sale_return = models.ForeignKey(Return, null=True, blank=True, on_delete=models.PROTECT, related_name="ledger_entries")
    description = models.CharField(max_length=255)
    debit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name_plural = "sales ledger"

    def __str__(self):
        return self.description
