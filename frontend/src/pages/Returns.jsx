import { useState } from "react";
import api from "../api/client";
import { errorMessage } from "../api/errors";
import DataTable from "../components/DataTable";
import { ErrorBox, Field, PageHeader } from "../components/UI";
import { useToast } from "../context/ToastContext";
import { useLoad } from "../hooks/useLoad";
import { dateTime, money } from "../utils/format";


export default function Returns() {
  const toast = useToast();
  const { data: returns, loading, error, reload } = useLoad(async () => (await api.get("/sales/returns/")).data);

  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState(null);
  const [bill, setBill] = useState(null);
  const [qty, setQty] = useState({}); // product id -> quantity to return
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const find = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      setMatches((await api.get("/sales/bills/", { params: { search } })).data);
    } catch (err) {
      setFormError(errorMessage(err));
    }
  };

  const pick = async (summary) => {
    try {
      setBill((await api.get(`/sales/bills/${summary.id}/`)).data);
      setQty({});
      setReason("");
      setFormError("");
    } catch (err) {
      setFormError(errorMessage(err));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const items = Object.entries(qty)
      .filter(([, q]) => Number(q) > 0)
      .map(([product_id, q]) => ({ product_id: Number(product_id), quantity: Number(q) }));
    if (!items.length) return setFormError("Enter a quantity for at least one item.");
    setBusy(true);
    setFormError("");
    try {
      const { data } = await api.post("/sales/returns/create/", { sale_id: bill.id, reason, items });
      toast.success(`Return recorded. Refund ${money(data.total)}. Stock restored.`);
      setBill(null);
      setMatches(null);
      setSearch("");
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Product returns" subtitle="Return items from an existing bill - stock is restored automatically" />

      <div className="card">
        <h3>New return</h3>
        <form onSubmit={find} className="filters">
          <input placeholder="Find bill: invoice number, customer or phone" value={search} onChange={(e) => setSearch(e.target.value)} required />
          <button className="btn btn-primary">Find bill</button>
        </form>
        <ErrorBox message={formError} />

        {matches && !bill && (
          <DataTable
            rows={matches}
            empty="No matching bills."
            columns={[
              { key: "invoice_number", label: "Invoice" },
              { key: "created_at", label: "Date", render: (s) => dateTime(s.created_at) },
              { key: "customer_name", label: "Customer", render: (s) => s.customer_name || "Walk-in" },
              { key: "total", label: "Total", className: "num", render: (s) => money(s.total) },
              {
                key: "actions",
                label: "",
                className: "actions",
                render: (s) => (
                  <button className="btn btn-small" onClick={() => pick(s)}>
                    Select
                  </button>
                ),
              },
            ]}
          />
        )}

        {bill && (
          <form onSubmit={submit} className="form">
            <p>
              Returning from <strong>{bill.invoice_number}</strong> ({dateTime(bill.created_at)}) — total {money(bill.total)}
            </p>
            <DataTable
              rows={bill.items}
              columns={[
                { key: "product_name", label: "Item" },
                { key: "quantity", label: "Sold" },
                { key: "unit_price", label: "Price", className: "num", render: (i) => money(i.unit_price) },
                { key: "returnable_quantity", label: "Can return" },
                {
                  key: "return",
                  label: "Return qty",
                  render: (i) => (
                    <input
                      className="qty-input"
                      type="number"
                      min="0"
                      max={i.returnable_quantity}
                      disabled={i.returnable_quantity === 0}
                      value={qty[i.product] ?? ""}
                      onChange={(e) => setQty({ ...qty, [i.product]: e.target.value })}
                    />
                  ),
                },
              ]}
            />
            <Field label="Reason for return">
              <input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong size, damaged piece" />
            </Field>
            <div className="row-actions">
              <button type="button" className="btn" onClick={() => setBill(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Saving..." : "Record return"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card">
        <h3>Return history</h3>
        <ErrorBox message={error} onRetry={reload} />
        <DataTable
          loading={loading}
          rows={returns}
          empty="No returns recorded."
          columns={[
            { key: "invoice_number", label: "Invoice" },
            { key: "created_at", label: "Date", render: (r) => dateTime(r.created_at) },
            { key: "items", label: "Items", render: (r) => r.items.map((i) => `${i.product_name} × ${i.quantity}`).join(", ") },
            { key: "reason", label: "Reason" },
            { key: "total", label: "Refund", className: "num", render: (r) => money(r.total) },
            { key: "created_by_name", label: "By" },
          ]}
        />
      </div>
    </>
  );
}
