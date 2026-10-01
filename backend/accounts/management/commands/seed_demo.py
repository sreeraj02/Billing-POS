"""Create demo users and sample data:  python manage.py seed_demo"""
from django.core.management.base import BaseCommand

from inventory.models import Category, Product
from suppliers.models import Supplier

from accounts.models import User


class Command(BaseCommand):
    help = "Creates demo admin/staff accounts, a category, products and a supplier (idempotent)."

    def handle(self, *args, **options):
        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={"is_staff": True, "is_superuser": True, "role": User.Role.ADMIN, "email": "admin@example.com"},
        )
        if created:
            admin.set_password("Admin@123")
            admin.save()

        staff, created = User.objects.get_or_create(
            username="staff1",
            defaults={"role": User.Role.STAFF, "first_name": "Demo", "last_name": "Staff", "phone": "9000000001"},
        )
        if created:
            staff.set_password("Staff@123")
            staff.save()

        category, _ = Category.objects.get_or_create(name="Men's Wear", defaults={"description": "Shirts, T-shirts and jeans"})
        samples = [
            ("Formal Shirt", "SHIRT001", 999, 650, 20),
            ("Cotton T-Shirt", "TSHIRT001", 599, 350, 30),
            ("Jeans", "JEANS001", 1499, 950, 15),
        ]
        for name, sku, price, cost, stock in samples:
            Product.objects.get_or_create(
                sku=sku,
                defaults={
                    "name": name, "category": category, "selling_price": price,
                    "purchase_price": cost, "stock": stock, "reorder_level": 5,
                },
            )
        Supplier.objects.get_or_create(name="ABC Textiles", defaults={"phone": "9876543210"})

        self.stdout.write(self.style.SUCCESS("Demo data ready."))
        self.stdout.write("Admin : admin / Admin@123 (only set when the account is newly created)")
        self.stdout.write("Staff : staff1 / Staff@123")
