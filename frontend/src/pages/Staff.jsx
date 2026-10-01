import { useState } from "react";
import api from "../api/client";
import { errorMessage } from "../api/errors";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { Badge, ErrorBox, Field, PageHeader } from "../components/UI";
import { useToast } from "../context/ToastContext";
import { useLoad } from "../hooks/useLoad";
import { dateTime } from "../utils/format";
import { asList } from "../utils/list";


const BLANK = { username: "", password: "", first_name: "", last_name: "", email: "", phone: "" };

export default function Staff() {
  const toast = useToast();
  const { data, loading, error, reload } = useLoad(async () => (await api.get("/auth/staff/")).data);

  // Works whether the API returns a plain array or a paginated {count, results} object.
  const rows = asList(data);

  const [editing, setEditing] = useState(null); // null = modal closed, {} = new, member = edit
  const [form, setForm] = useState(BLANK);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false); // blocks double submit on the form
  const [busyId, setBusyId] = useState(null); // blocks double click on row actions

  const isEdit = Boolean(editing?.id);

  const openForm = (member) => {
    setEditing(member || {});
    setFormError("");
    setForm(
      member
        ? {
            username: member.username,
            password: "",
            first_name: member.first_name || "",
            last_name: member.last_name || "",
            email: member.email || "",
            phone: member.phone || "",
          }
        : BLANK
    );
  };

  const closeForm = () => {
    if (saving) return;
    setEditing(null);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;

    const payload = { ...form, username: form.username.trim() };
    if (isEdit && !payload.password) delete payload.password; // blank = keep the current password

    setSaving(true);
    setFormError("");
    try {
      if (isEdit) await api.patch(`/auth/staff/${editing.id}/`, payload);
      else await api.post("/auth/staff/", payload);
      toast.success("Staff member saved.");
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (member) => {
    if (busyId) return;
    setBusyId(member.id);
    try {
      await api.patch(`/auth/staff/${member.id}/`, { is_active: !member.is_active });
      toast.success(member.is_active ? "Staff deactivated." : "Staff activated.");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (member) => {
    if (busyId) return;
    if (!window.confirm(`Delete staff "${member.username}"?`)) return;
    setBusyId(member.id);
    try {
      const res = await api.delete(`/auth/staff/${member.id}/`);
      toast.success(res.data?.detail || "Staff deleted.");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader title="Staff" subtitle="Billing counter accounts">
        <button className="btn btn-primary" onClick={() => openForm()}>
          + Add staff
        </button>
      </PageHeader>
      <div className="card">
        <ErrorBox message={error} onRetry={reload} />
        <DataTable
          loading={loading && !data}
          rows={rows}
          empty="No staff accounts yet."
          columns={[
            { key: "full_name", label: "Name", render: (s) => s.full_name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || "-" },
            { key: "username", label: "Username" },
            { key: "email", label: "Email", render: (s) => s.email || "-" },
            { key: "phone", label: "Phone", render: (s) => s.phone || "-" },
            {
              key: "is_active",
              label: "Status",
              render: (s) => <Badge tone={s.is_active ? "green" : "gray"}>{s.is_active ? "Active" : "Inactive"}</Badge>,
            },
            { key: "date_joined", label: "Joined", render: (s) => (s.date_joined ? dateTime(s.date_joined) : "-") },
            {
              key: "actions",
              label: "",
              className: "actions",
              render: (s) => (
                <>
                  <button className="btn btn-small" disabled={busyId === s.id} onClick={() => openForm(s)}>
                    Edit
                  </button>{" "}
                  <button className="btn btn-small" disabled={busyId === s.id} onClick={() => toggle(s)}>
                    {s.is_active ? "Deactivate" : "Activate"}
                  </button>{" "}
                  <button className="btn btn-small btn-danger" disabled={busyId === s.id} onClick={() => remove(s)}>
                    Delete
                  </button>
                </>
              ),
            },
          ]}
        />
      </div>

      {editing && (
        <Modal title={isEdit ? "Edit staff" : "New staff"} onClose={closeForm}>
          <form onSubmit={save} className="form">
            <ErrorBox message={formError} />
            <div className="form-grid">
              <Field label="Username">
                <input required autoComplete="off" value={form.username} onChange={set("username")} />
              </Field>
              <Field label="Password" hint={isEdit ? "Leave blank to keep the current password" : "Minimum 6 characters"}>
                <input
                  type="password"
                  minLength={6}
                  required={!isEdit}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set("password")}
                />
              </Field>
              <Field label="First name">
                <input value={form.first_name} onChange={set("first_name")} />
              </Field>
              <Field label="Last name">
                <input value={form.last_name} onChange={set("last_name")} />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={set("email")} />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={set("phone")} />
              </Field>
            </div>
            <div className="row-actions">
              <button type="button" className="btn" disabled={saving} onClick={closeForm}>
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