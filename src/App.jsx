import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import Login from "./pages/Login.jsx";
import EngineerDashboard from "./pages/EngineerDashboard.jsx";
import EnergyForecast from "./pages/EnergyForecast.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import TechnicianWorkOrders from "./pages/TechnicianWorkOrders.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";


// ANA SAYFAYA (/) GELENLERİ KİMLİĞİNE GÖRE DAĞITAN KISIM
function RoleHome() {
  const { user } = useAuth();

  if (user?.role === "TECHNICIAN") {
    return <Navigate to="/technician/work-orders" replace />;
  }

  // Admin ve Manager aynı rapor paneline gitsin
  if (user?.role === "MANAGER" || user?.role === "ADMIN") {
    return <Navigate to="/manager/dashboard" replace />;
  }

  // Geri kalanlar (Mühendis ve Operatör) bu ekranı görsün
  return <EngineerDashboard />;
}

export default function App() {
  return (
    <>
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

      {/* Senin eserin olan Bildirim parçası burada, tüm sayfaların üzerinde çalışacak */}
     
    </>
  );
}