// Sidebar / mobile menu entries. `to` is relative to the shell base ("" or "/mobile-admin").
export const NAV = [
  { to: "dashboard", label: "Dashboard", roles: ["ADMIN"] },
  { to: "billing", label: "Billing (POS)", roles: ["ADMIN", "STAFF"] },
  { to: "bills", label: "Bills", roles: ["ADMIN", "STAFF"] },
  { to: "products", label: "Products", roles: ["ADMIN"] },
  { to: "categories", label: "Categories", roles: ["ADMIN"] },
  { to: "suppliers", label: "Suppliers", roles: ["ADMIN"] },
  { to: "staff", label: "Staff", roles: ["ADMIN"] },
  { to: "returns", label: "Returns", roles: ["ADMIN"] },
  { to: "ledger", label: "Ledger", roles: ["ADMIN"] },
  { to: "reports", label: "Reports", roles: ["ADMIN"] },
];
