import { useState } from "react";
import api from "../api/client";
import { errorMessage } from "../api/errors";
import DataTable from "../components/DataTable";
import Invoice from "../components/Invoice";
import Modal from "../components/Modal";
import { ErrorBox, PageHeader } from "../components/UI";
import { useToast } from "../context/ToastContext";
import { useDebounce, useLoad } from "../hooks/useLoad";
import { dateTime, money } from "../utils/format";
import { asList } from "../utils/list";

export default function Bills() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [method, setMethod] = useState("");
  const query = useDebounce(search);
  const [selected, setSelected] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);   // <- add this

  const { data, loading, error, reload } = useLoad(
    async () =>
      (await api.get("/sales/bills/", { params: { search: query, date_from: from, date_to: to, payment_method: method } })).data,
    [query, from, to, method]
  );

  const open = async (bill) => {
    try {
      setSelected((await api.get(`/sales/bills/${bill.id}/`)).data);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Bills / Transactions" subtitle="Every invoice created in the system" />
      <div className="card">
        <div className="filters">
          <input placeholder="Invoice, customer or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">All payments</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="UPI">UPI</option>
            <option value="MIXED">Mixed</option>
          </select>
        </div>
        <ErrorBox message={error} onRetry={reload} />
        <DataTable
          loading={loading}
          rows={asList(data)}
          empty="No bills found."
          columns={[
            { key: "invoice_number", label: "Invoice" },
            { key: "created_at", label: "Date", render: (s) => dateTime(s.created_at) },
            { key: "customer_name", label: "Customer", render: (s) => s.customer_name || "Walk-in" },
            { key: "created_by_name", label: "Staff" },
            { key: "payment_method", label: "Payment" },
            { key: "total", label: "Total", className: "num", render: (s) => money(s.total) },
            {
              key: "actions",
              label: "",
              className: "actions",
              render: (s) => (
                <button className="btn btn-small" onClick={() => open(s)}>
                  View / Print
                </button>
              ),
            },
          ]}
        />
      </div>

      {selected && (
        <Modal title={`Bill ${selected.invoice_number}`} onClose={() => setSelected(null)} wide>
          <div className="print-area">
            <Invoice sale={selected} />
          </div>
          <div className="row-actions no-print">
            <button className="btn" onClick={() => setSelected(null)}>
              Close
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              🖨 Print Bill
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
