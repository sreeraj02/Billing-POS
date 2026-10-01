import { useState } from "react";
import api from "../api/client";
import { errorMessage } from "../api/errors";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { Badge, ErrorBox, Field, PageHeader } from "../components/UI";
import { useToast } from "../context/ToastContext";
import { useLoad } from "../hooks/useLoad";
import { dateTime, money } from "../utils/format";
import { asList } from "../utils/list";

const BLANK = { name: "", phone: "", email: "", address: "", opening_balance: "0", active: true };

function SupplierLedger({ supplier, onClose, onChanged }) {
  const toast = useToast();
  const { data, loading, error, reload } = useLoad(
    async () => (await api.get("/suppliers/ledger/", { params: { supplier: supplier.id } })).data,
    [supplier.id]
  );
  const [entry, setEntry] = useState({ kind: "credit", amount: "", description: "" });
  const [formError, setFormError] = useState("");

  const balance = data
    ? Number(supplier.opening_balance) + data.reduce((sum, e) => sum + Number(e.credit) - Number(e.debit), 0)
    : Number(supplier.balance);

  const add = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      await api.post("/suppliers/ledger/", {
        supplier: supplier.id,
        description: entry.description,
        [entry.kind]: Number(entry.amount),
      });
      toast.success("Ledger entry added.");
      setEntry({ kind: "credit", amount: "", description: "" });
      reload();
      onChanged();
    } catch (err) {
      setFormError(errorMessage(err));
    }
  };

  return (
    <Modal title={`Ledger — ${supplier.name}`} onClose={onClose} wide>
      <p>
        Opening balance: <strong>{money(supplier.opening_balance)}</strong> · Payable now: <strong>{money(balance)}</strong>
      </p>
      <form onSubmit={add} className="form">
        <ErrorBox message={formError} />
        <div className="form-grid">
          <Field label="Entry type">
            <select value={entry.kind} onChange={(e) => setEntry({ ...entry, kind: e.target.value })}>
              <option value="credit">Purchase / bill received (we owe more)</option>
              <option value="debit">Payment made to supplier</option>
            </select>
          </Field>
          <Field label="Amount (₹)">
            <input type="number" min="0.01" step="0.01" required value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: e.target.value })} />
          </Field>
          <Field label="Description">
            <input required value={entry.description} onChange={(e) => setEntry({ ...entry, description: e.target.value })} />
          </Field>
        </div>
        <div className="row-actions">
          <button className="btn btn-primary">Add entry</button>
        </div>
      </form>
      <ErrorBox message={error} onRetry={reload} />
      <DataTable
        loading={loading}
        rows={asList(data)}
        empty="No ledger entries yet."
        columns={[
          { key: "created_at", label: "Date", render: (e) => dateTime(e.created_at) },
          { key: "description", label: "Description" },
          { key: "debit", label: "Paid (Dr)", className: "num", render: (e) => (Number(e.debit) ? money(e.debit) : "-") },
          { key: "credit", label: "Purchase (Cr)", className: "num", render: (e) => (Number(e.credit) ? money(e.credit) : "-") },
        ]}
      />
    </Modal>
  );
}

export default function Suppliers() {
  const toast = useToast();
  const { data, loading, error, reload } = useLoad(async () => (await api.get("/suppliers/suppliers/")).data);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [formError, setFormError] = useState("");
  const [ledgerFor, setLedgerFor] = useState(null);

  const openForm = (supplier) => {
    setEditing(supplier || {});
    setFormError("");
    setForm(
      supplier
        ? { name: supplier.name, phone: supplier.phone, email: supplier.email, address: supplier.address, opening_balance: supplier.opening_balance, active: supplier.active }
        : BLANK
    );
  };
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing.id) await api.patch(`/suppliers/suppliers/${editing.id}/`, form);
      else await api.post("/suppliers/suppliers/", form);
      toast.success("Supplier saved.");
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    }
  };

  const remove = async (supplier) => {
    if (!window.confirm(`Delete supplier "${supplier.name}" and its ledger?`)) return;
    try {
      await api.delete(`/suppliers/suppliers/${supplier.id}/`);
      toast.success("Supplier deleted.");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Suppliers" subtitle="Vendors and their payable ledger">
        <button className="btn btn-primary" onClick={() => openForm()}>
          + Add supplier
        </button>
      </PageHeader>
      <div className="card">
        <ErrorBox message={error} onRetry={reload} />
        <DataTable
          loading={loading}
          rows={data}
          empty="No suppliers yet."
          columns={[
            { key: "name", label: "Name" },
            { key: "phone", label: "Phone", render: (s) => s.phone || "-" },
            { key: "email", label: "Email", render: (s) => s.email || "-" },
            { key: "balance", label: "Payable", className: "num", render: (s) => money(s.balance) },
            { key: "active", label: "Status", render: (s) => <Badge tone={s.active ? "green" : "gray"}>{s.active ? "Active" : "Inactive"}</Badge> },
            {
              key: "actions",
              label: "",
              className: "actions",
              render: (s) => (
                <>
                  <button className="btn btn-small" onClick={() => setLedgerFor(s)}>
                    Ledger
                  </button>{" "}
                  <button className="btn btn-small" onClick={() => openForm(s)}>
                    Edit
                  </button>{" "}
                  <button className="btn btn-small btn-danger" onClick={() => remove(s)}>
                    Delete
                  </button>
                </>
              ),
            },
          ]}
        />
      </div>

      {editing && (
        <Modal title={editing.id ? "Edit supplier" : "New supplier"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="form">
            <ErrorBox message={formError} />
            <div className="form-grid">
              <Field label="Name">
                <input required value={form.name} onChange={set("name")} />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={set("phone")} />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={set("email")} />
              </Field>
              <Field label="Opening balance (₹)">
                <input type="number" step="0.01" value={form.opening_balance} onChange={set("opening_balance")} />
              </Field>
            </div>
            <Field label="Address">
              <textarea rows="2" value={form.address} onChange={set("address")} />
            </Field>
            <label className="check">
              <input type="checkbox" checked={form.active} onChange={set("active")} /> Active
            </label>
            <div className="row-actions">
              <button type="button" className="btn" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {ledgerFor && <SupplierLedger supplier={ledgerFor} onClose={() => setLedgerFor(null)} onChanged={reload} />}
    </>
  );
}
