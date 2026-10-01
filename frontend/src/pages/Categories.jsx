import { useState } from "react";
import api from "../api/client";
import { errorMessage } from "../api/errors";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { ErrorBox, Field, PageHeader } from "../components/UI";
import { useToast } from "../context/ToastContext";
import { useLoad } from "../hooks/useLoad";
import { asList } from "../utils/list";

export default function Categories() {
  const toast = useToast();
  const { data, loading, error, reload } = useLoad(async () => (await api.get("/inventory/categories/")).data);
  const [editing, setEditing] = useState(null); // null | {} (new) | category
  const [form, setForm] = useState({ name: "", description: "" });
  const [formError, setFormError] = useState("");

  const openForm = (category = {}) => {
    setEditing(category);
    setForm({ name: category.name || "", description: category.description || "" });
    setFormError("");
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing.id) await api.patch(`/inventory/categories/${editing.id}/`, form);
      else await api.post("/inventory/categories/", form);
      toast.success("Category saved.");
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    }
  };

  const remove = async (category) => {
    if (!window.confirm(`Delete category "${category.name}"? Its products will become uncategorised.`)) return;
    try {
      await api.delete(`/inventory/categories/${category.id}/`);
      toast.success("Category deleted.");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Categories" subtitle="Group your products">
        <button className="btn btn-primary" onClick={() => openForm()}>
          + Add category
        </button>
      </PageHeader>
      <div className="card">
        <ErrorBox message={error} onRetry={reload} />
        <DataTable
          loading={loading}
          rows={asList(data)}
          empty="No categories yet."
          columns={[
            { key: "name", label: "Name" },
            { key: "description", label: "Description", render: (c) => c.description || "-" },
            { key: "product_count", label: "Products" },
            {
              key: "actions",
              label: "",
              className: "actions",
              render: (c) => (
                <>
                  <button className="btn btn-small" onClick={() => openForm(c)}>
                    Edit
                  </button>{" "}
                  <button className="btn btn-small btn-danger" onClick={() => remove(c)}>
                    Delete
                  </button>
                </>
              ),
            },
          ]}
        />
      </div>

      {editing && (
        <Modal title={editing.id ? "Edit category" : "New category"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="form">
            <ErrorBox message={formError} />
            <Field label="Name">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Description">
              <textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="row-actions">
              <button type="button" className="btn" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
