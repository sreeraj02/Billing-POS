import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { errorMessage } from "../api/errors";
import { useAuth } from "../context/AuthContext";
import { Field } from "../components/UI";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice] = useState(() => {
    const message = sessionStorage.getItem("notice");
    sessionStorage.removeItem("notice");
    return message;
  });

  if (user) return <Navigate to={location.state?.from?.pathname || "/"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const loggedIn = await login(form.username.trim(), form.password);
      navigate(location.state?.from?.pathname || (loggedIn.role === "ADMIN" ? "/dashboard" : "/billing"), { replace: true });
    } catch (err) {
      setError(err.response?.status === 401 ? "Invalid username or password." : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">🧾</div>
        <h1>POS Billing Software</h1>
        <p className="muted">Sign in to continue</p>
        {notice && <div className="alert alert-warn">{notice}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <Field label="Username">
          <input value={form.username} autoFocus required onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </Field>
        <Field label="Password">
          <input type="password" value={form.password} required onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
