import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import MobileShell from "./components/MobileShell";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import Billing from "./pages/Billing";
import Bills from "./pages/Bills";
import Categories from "./pages/Categories";
import Dashboard from "./pages/Dashboard";
import Ledger from "./pages/Ledger";
import Login from "./pages/Login";
import Products from "./pages/Products";
import Reports from "./pages/Reports";
import Returns from "./pages/Returns";
import Staff from "./pages/Staff";
import Suppliers from "./pages/Suppliers";

const admin = (page) => <ProtectedRoute roles={["ADMIN"]}>{page}</ProtectedRoute>;

// The same pages are mounted under both shells: desktop ("/...") and mobile ("/mobile-admin/...").
const pageRoutes = () => [
  <Route key="dashboard" path="dashboard" element={admin(<Dashboard />)} />,
  <Route key="billing" path="billing" element={<Billing />} />,
  <Route key="bills" path="bills" element={<Bills />} />,
  <Route key="products" path="products" element={admin(<Products />)} />,
  <Route key="categories" path="categories" element={admin(<Categories />)} />,
  <Route key="suppliers" path="suppliers" element={admin(<Suppliers />)} />,
  <Route key="staff" path="staff" element={admin(<Staff />)} />,
  <Route key="returns" path="returns" element={admin(<Returns />)} />,
  <Route key="ledger" path="ledger" element={admin(<Ledger />)} />,
  <Route key="reports" path="reports" element={admin(<Reports />)} />,
];

function HomeRedirect() {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? "/dashboard" : "/billing"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        {pageRoutes()}
      </Route>

      <Route
        path="/mobile-admin"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <MobileShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        {pageRoutes()}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
