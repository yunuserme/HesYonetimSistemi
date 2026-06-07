import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import Login from "./pages/Login.jsx";
import EngineerDashboard from "./pages/EngineerDashboard.jsx";
import EnergyForecast from "./pages/EnergyForecast.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import ScadaPanel from "./pages/ScadaPanel.jsx";
import TechnicianWorkOrders from "./pages/TechnicianWorkOrders.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

const SCADA_ALLOWED_ROLES = ["ADMIN", "OPERATOR"];

function normalizeRole(role) {
  return String(role ?? "").toUpperCase();
}

function RoleHome() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);

  if (role === "TECHNICIAN") {
    return <Navigate to="/technician/work-orders" replace />;
  }

  if (role === "MANAGER") {
    return <Navigate to="/manager/dashboard" replace />;
  }

  if (role === "OPERATOR") {
    return <Navigate to="/scada" replace />;
  }

  return <EngineerDashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<RoleHome />} />
          <Route
            path="forecast"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "ENGINEER", "MANAGER"]}>
                <EnergyForecast />
              </ProtectedRoute>
            }
          />
          <Route
            path="scada"
            element={
              <ProtectedRoute allowedRoles={SCADA_ALLOWED_ROLES}>
                <ScadaPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="manager/dashboard"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="technician/work-orders"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "TECHNICIAN"]}>
                <TechnicianWorkOrders />
              </ProtectedRoute>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
