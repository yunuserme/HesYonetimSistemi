import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getDefaultPathForRole, useAuth } from "../context/AuthContext.jsx";

function normalizeRole(role) {
  return String(role ?? "").toUpperCase();
}

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">Checking session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const normalizedRole = normalizeRole(user.role);
  const normalizedAllowedRoles = allowedRoles?.map(normalizeRole);

  if (normalizedAllowedRoles?.length && !normalizedAllowedRoles.includes(normalizedRole)) {
    return <Navigate to={getDefaultPathForRole(normalizedRole)} replace />;
  }

  return children ?? <Outlet />;
}
