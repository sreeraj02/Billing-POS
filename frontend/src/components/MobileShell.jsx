import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NAV } from "./navItems";

const BASE = "/mobile-admin";
const TABS = ["dashboard", "billing", "products", "bills"];

// The complete admin portal inside a phone-sized, app-style layout (drawer + bottom tabs).
export default function MobileShell() {
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const items = NAV.filter((n) => n.roles.includes(user.role));
  const current = items.find((n) => location.pathname.startsWith(`${BASE}/${n.to}`));

  return (
    <div className="mobile-stage">
      <div className="phone mobile-shell">
        <header className="app-bar">
          <button className="icon-btn light" onClick={() => setMenu(true)} aria-label="Menu">
            ☰
          </button>
          <strong>{current?.label || "Dashboard"}</strong>
          <span className="avatar">{user.username.slice(0, 1).toUpperCase()}</span>
        </header>

        <div className="phone-body">
          <div className="page-container">
            <Outlet />
          </div>
        </div>

        <nav className="tab-bar">
          {TABS.map((t) => {
            const item = NAV.find((n) => n.to === t);
            return (
              <NavLink key={t} to={`${BASE}/${t}`} className="tab">
                <span>{item.icon}</span>
                <small>{item.label.replace(" (POS)", "")}</small>
              </NavLink>
            );
          })}
          <button className="tab" onClick={() => setMenu(true)}>
            <span>☰</span>
            <small>More</small>
          </button>
        </nav>

        {menu && (
          <div className="drawer-wrap">
            <div className="scrim" onClick={() => setMenu(false)} />
            <aside className="drawer">
              <div className="brand">🧾 POS Billing</div>
              <p className="muted drawer-user">
                {user.full_name} · {user.role}
              </p>
              <nav>
                {items.map((n) => (
                  <NavLink key={n.to} to={`${BASE}/${n.to}`} onClick={() => setMenu(false)} className="nav-link">
                    <span>{n.icon}</span> {n.label}
                  </NavLink>
                ))}
                <Link to="/dashboard" className="nav-link nav-link-alt">
                  <span>🖥️</span> Desktop view
                </Link>
              </nav>
              <button className="btn btn-light" onClick={logout}>
                Logout
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
