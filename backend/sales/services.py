"""Business logic for checkout and returns.

Both operations run inside a single database transaction. Rows that are read and then
modified (products for checkout, the sale for returns) are locked with select_for_update()
so concurrent requests cannot oversell stock or over-return items. If any validation fails
an exception is raised and the whole transaction is rolled back - nothing is half-saved.
"""
from decimal import ROUND_HALF_UP, Decimal
from uuid import uuid4

from django.db import transaction
from django.db.models import Count, F, Sum
from rest_framework.exceptions import ValidationError

from inventory.models import Product

from .models import Return, ReturnItem, Sale, SaleItem, SalesLedger

CENT = Decimal("0.01")


def money(value) -> Decimal:
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def sale_queryset():
    return Sale.objects.select_related("created_by").prefetch_related("items").annotate(item_count=Count("items", distinct=True))


def _merge_quantities(items):
    merged = {}
    for item in items:
        merged[item["product_id"]] = merged.get(item["product_id"], 0) + item["quantity"]
    return merged


@transaction.atomic
def checkout(user, data) -> Sale:
    quantities = _merge_quantities(data["items"])

    # Lock the products in a fixed order (avoids deadlocks) before checking stock.
    products = {p.pk: p for p in Product.objects.select_for_update().filter(pk__in=list(quantities)).order_by("pk")}

    lines = []
    subtotal = Decimal("0")
    for product_id, qty in quantities.items():
        product = products.get(product_id)
        if product is None:
            raise ValidationError(f"Product with id {product_id} does not exist.")
        if not product.active:
            raise ValidationError(f"{product.name} is inactive and cannot be sold.")
        if product.stock < qty:
            raise ValidationError(f"Insufficient stock for {product.name}. Available: {product.stock}, requested: {qty}.")
        line_total = money(product.selling_price * qty)
        subtotal += line_total
        lines.append((product, qty, line_total))

    discount = money(data.get("discount") or 0)
    if discount > subtotal:
        raise ValidationError("Discount cannot be greater than the subtotal.")
    total = subtotal - discount

    paid_amount = data.get("paid_amount")
    paid_amount = total if paid_amount is None else money(paid_amount)
    if paid_amount < total:
        raise ValidationError(f"Paid amount is less than the bill total ({total}).")

    sale = Sale.objects.create(
        invoice_number=uuid4().hex[:20],  # temporary, replaced below once the primary key is known
        customer_name=data.get("customer_name", ""),
        customer_phone=data.get("customer_phone", ""),
        subtotal=subtotal,
        discount=discount,
        total=total,
        payment_method=data.get("payment_method", Sale.PaymentMethod.CASH),
        paid_amount=paid_amount,
        created_by=user,
    )
    sale.invoice_number = f"INV-{sale.pk:06d}"
    sale.save(update_fields=["invoice_number"])

    SaleItem.objects.bulk_create(
        [
            SaleItem(
                sale=sale, product=p, product_name=p.name, sku=p.sku,
                quantity=qty, unit_price=p.selling_price, line_total=line_total,
            )
            for p, qty, line_total in lines
        ]
    )
    for product, qty, _ in lines:
        Product.objects.filter(pk=product.pk).update(stock=F("stock") - qty)

    SalesLedger.objects.create(
        entry_type=SalesLedger.EntryType.SALE,
        sale=sale,
        description=f"Sale {sale.invoice_number}",
        credit=total,
    )
    return sale_queryset().get(pk=sale.pk)


@transaction.atomic
def create_return(user, data) -> Return:
    try:
        sale = Sale.objects.select_for_update().get(pk=data["sale_id"])
    except Sale.DoesNotExist:
        raise ValidationError("The original sale was not found.")

    sold = {item.product_id: item for item in sale.items.all()}
    already_returned = dict(
        ReturnItem.objects.filter(sale_return__sale=sale)
        .values("product_id")
        .annotate(qty=Sum("quantity"))
        .values_list("product_id", "qty")
    )

   
    ratio = (sale.total / sale.subtotal) if sale.subtotal > 0 else Decimal("1")

    lines = []
    total = Decimal("0")
    for product_id, qty in _merge_quantities(data["items"]).items():
        item = sold.get(product_id)
        if item is None:
            raise ValidationError(f"Product id {product_id} was not part of {sale.invoice_number}.")
        available = item.quantity - already_returned.get(product_id, 0)
        if qty > available:
            raise ValidationError(
                f"Cannot return {qty} x {item.product_name}. Only {available} left to return on {sale.invoice_number}."
            )
        amount = money(item.unit_price * qty * ratio)
        total += amount
        lines.append((item, qty, amount))

    sale_return = Return.objects.create(sale=sale, reason=data["reason"], total=total, created_by=user)
    ReturnItem.objects.bulk_create(
        [ReturnItem(sale_return=sale_return, product_id=item.product_id, quantity=qty, amount=amount) for item, qty, amount in lines]
    )
    for item, qty, _ in lines:
        Product.objects.filter(pk=item.product_id).update(stock=F("stock") + qty)

    SalesLedger.objects.create(
        entry_type=SalesLedger.EntryType.RETURN,
        sale=sale,
        sale_return=sale_return,
        description=f"Return for {sale.invoice_number}",
        debit=total,
    )
    return sale_return
