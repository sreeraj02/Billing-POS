import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NAV } from "./navItems";

export default function AppShell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const items = NAV.filter((n) => n.roles.includes(user.role));
  const current = items.find((n) => location.pathname.startsWith(`/${n.to}`));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">🧾 POS Billing</div>
        <nav>
          {items.map((n) => (
            <NavLink key={n.to} to={`/${n.to}`} onClick={() => setOpen(false)} className="nav-link">
              <span>{n.icon}</span> {n.label}
            </NavLink>
          ))}
          {user.role === "ADMIN" && (
            <NavLink to="/mobile-admin" className="nav-link nav-link-alt">
              <span>📱</span> Mobile admin view
            </NavLink>
          )}
        </nav>
        <div className="sidebar-foot">
          <div className="who">
            <strong>{user.full_name}</strong>
            <small>{user.role}</small>
          </div>
          <button className="btn btn-light btn-small" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            ☰
          </button>
          <h3>{current?.label || "POS Billing"}</h3>
          <span className="topbar-user muted">{user.full_name}</span>
        </header>
        <main className="content">
          <div className="page-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
