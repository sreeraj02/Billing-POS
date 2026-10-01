import { useState } from "react";
import api from "../api/client";
import { errorMessage } from "../api/errors";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { Badge, ErrorBox, Field, PageHeader } from "../components/UI";
import { useToast } from "../context/ToastContext";
import { useDebounce, useLoad } from "../hooks/useLoad";
import { money } from "../utils/format";
import { asList } from "../utils/list";

const BLANK = {
  name: "", category: "", sku: "", barcode: "", purchase_price: "", selling_price: "",
  stock: "0", reorder_level: "5", active: true,
};

export default function Products() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const query = useDebounce(search);

  
  const { data: categories } = useLoad(async () => (await api.get("/inventory/categories/")).data);
  const { data, loading, error, reload } = useLoad(
    async () => {
      const params = { search: query, category };
      if (status === "active" || status === "inactive") params.active = status === "active";
      if (status === "low") params.low_stock = true;
      return (await api.get("/inventory/products/", { params })).data;
    },
    [query, category, status]
  );

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);   // <- add this

  const openForm = (product) => {
    setEditing(product || {});
    setFormError("");
    setForm(
      product
        ? {
            name: product.name, category: product.category ?? "", sku: product.sku, barcode: product.barcode ?? "",
            purchase_price: product.purchase_price, selling_price: product.selling_price,
            stock: String(product.stock), reorder_level: String(product.reorder_level), active: product.active,
          }
        : BLANK
    );
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

const save = async (e) => {
  e.preventDefault();
  if (saving) return;
  setSaving(true);
  try {
    await api.post("/products/", form);
    toast.success("Saved.");
    reload();
  } catch (err) {
    setFormError(errorMessage(err));
  } finally {
    setSaving(false);
}
};

  const remove = async (product) => {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    try {
      await api.delete(`/inventory/products/${product.id}/`);
      toast.success("Product deleted.");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Products" subtitle="Manage inventory, prices and stock">
        <button className="btn btn-primary" onClick={() => openForm()}>
          + Add product
        </button>
      </PageHeader>
      <div className="card">
        <div className="filters">
          <input placeholder="Search name, SKU, barcode" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All products</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="low">Low stock</option>
          </select>
        </div>
        <ErrorBox message={error} onRetry={reload} />
        <DataTable
          loading={loading}
          rows={asList(data)}
          empty="No products found."
          columns={[
            { key: "name", label: "Product" },
            { key: "sku", label: "SKU" },
            { key: "category_name", label: "Category", render: (p) => p.category_name || "-" },
            { key: "purchase_price", label: "Cost", className: "num", render: (p) => money(p.purchase_price) },
            { key: "selling_price", label: "Price", className: "num", render: (p) => money(p.selling_price) },
            {
              key: "stock",
              label: "Stock",
              render: (p) => <Badge tone={p.stock === 0 ? "red" : p.is_low_stock ? "amber" : "green"}>{p.stock}</Badge>,
            },
            { key: "active", label: "Status", render: (p) => <Badge tone={p.active ? "green" : "gray"}>{p.active ? "Active" : "Inactive"}</Badge> },
            {
              key: "actions",
              label: "",
              className: "actions",
              render: (p) => (
                <>
                  <button className="btn btn-small" onClick={() => openForm(p)}>
                    Edit
                  </button>{" "}
                  <button className="btn btn-small btn-danger" onClick={() => remove(p)}>
                    Delete
                  </button>
                </>
              ),
            },
          ]}
        />
      </div>

      {editing && (
        <Modal title={editing.id ? "Edit product" : "New product"} onClose={() => setEditing(null)} wide>
          <form onSubmit={save} className="form">
            <ErrorBox message={formError} />
            <div className="form-grid">
              <Field label="Name">
                <input required value={form.name} onChange={set("name")} />
              </Field>
              <Field label="Category">
                <select value={form.category} onChange={set("category")}>
                  <option value="">— None —</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="SKU">
                <input required value={form.sku} onChange={set("sku")} />
              </Field>
              <Field label="Barcode">
                <input value={form.barcode} onChange={set("barcode")} />
              </Field>
              <Field label="Purchase price (₹)">
                <input type="number" step="0.01" min="0" required value={form.purchase_price} onChange={set("purchase_price")} />
              </Field>
              <Field label="Selling price (₹)">
                <input type="number" step="0.01" min="0" required value={form.selling_price} onChange={set("selling_price")} />
              </Field>
              <Field label="Stock">
                <input type="number" min="0" required value={form.stock} onChange={set("stock")} />
              </Field>
              <Field label="Reorder level">
                <input type="number" min="0" required value={form.reorder_level} onChange={set("reorder_level")} />
              </Field>
            </div>
            <label className="check">
              <input type="checkbox" checked={form.active} onChange={set("active")} /> Active (available for billing)
            </label>
            <div className="row-actions">
              <button type="button" className="btn" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
