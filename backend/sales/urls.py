from django.urls import path

from . import views

urlpatterns = [
    path("checkout/", views.CheckoutView.as_view(), name="checkout"),
    path("bills/", views.BillListView.as_view(), name="bill-list"),
    path("bills/<int:pk>/", views.BillDetailView.as_view(), name="bill-detail"),
    path("returns/", views.ReturnListView.as_view(), name="return-list"),
    path("returns/create/", views.ReturnCreateView.as_view(), name="return-create"),
    path("ledger/", views.SalesLedgerListView.as_view(), name="sales-ledger"),
    path("reports/sales/", views.SalesReportView.as_view(), name="sales-report"),
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
]
