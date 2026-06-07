import { useEffect, useRef, useState } from "react";
import { Activity, BarChart3, BriefcaseBusiness, ChevronDown, ClipboardList, Gauge, LogOut, RadioTower, UserRound } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const coreNavigation = [
  { to: "/", label: "Engineer Dashboard", icon: Gauge },
  { to: "/forecast", label: "Energy Forecast", icon: BarChart3 },
];

const managerNavigation = [
  { to: "/manager/dashboard", label: "Manager Dashboard", icon: BriefcaseBusiness },
  { to: "/forecast", label: "Energy Forecast", icon: BarChart3 },
];

const SCADA_NAVIGATION_ROLES = ["ADMIN", "OPERATOR"];
const scadaNavigationItem = { to: "/scada", label: "SCADA Panel", icon: RadioTower };

function normalizeRole(role) {
  return String(role ?? "").toUpperCase();
}

export default function DashboardLayout() {
  const { signOut, user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const role = normalizeRole(user?.role);
  const canViewScadaNavigation = SCADA_NAVIGATION_ROLES.includes(role);
  const navigation = role === "TECHNICIAN"
    ? [{ to: "/technician/work-orders", label: "My Work Orders", icon: ClipboardList }]
    : role === "ADMIN"
      ? [
          ...coreNavigation,
          ...(canViewScadaNavigation ? [scadaNavigationItem] : []),
          { to: "/manager/dashboard", label: "Manager Dashboard", icon: BriefcaseBusiness },
          { to: "/technician/work-orders", label: "Work Orders", icon: ClipboardList },
        ]
      : role === "MANAGER"
        ? managerNavigation
      : canViewScadaNavigation
        ? [scadaNavigationItem]
        : coreNavigation;
  const statusLabel = "Live data";

  useEffect(() => {
    function handleOutsideClick(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  async function handleSignOut() {
    await signOut();
    setIsProfileOpen(false);
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-white/85 px-4 py-4 backdrop-blur lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-700 text-[11px] font-bold tracking-normal text-white">
                HES
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">HES Yonetim Sistemi</p>
                <p className="text-xs text-slate-500">Hydroelectric Management Platform</p>
              </div>
            </div>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto lg:mt-8 lg:block lg:space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `flex min-w-fit items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      isActive
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-8 hidden rounded-lg border border-emerald-200 bg-emerald-50 p-4 lg:block">
            <div className="flex items-center gap-2 text-emerald-700">
              <Activity className="h-4 w-4" />
              <p className="text-sm font-semibold">Plant Load Stable</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-emerald-950">91%</p>
            <p className="mt-1 text-sm text-emerald-800">Capacity utilization</p>
          </div>
        </aside>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="mb-6 flex justify-end">
            <div ref={profileRef} className="relative max-w-full">
              <button
                type="button"
                onClick={() => setIsProfileOpen((current) => !current)}
                className="inline-flex max-w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-soft transition hover:bg-slate-50"
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
                  <UserRound className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block max-w-[9rem] truncate text-sm font-semibold text-slate-950 sm:max-w-[12rem]">
                    {user?.username}
                  </span>
                  <span className="block truncate text-xs font-semibold text-slate-500">
                    {user?.role}
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                    isProfileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isProfileOpen ? (
                <div
                  className="absolute right-0 z-20 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-3 shadow-soft"
                  role="menu"
                >
                  <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{user?.username}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">{user?.role}</p>
                      <p className="mt-1 text-xs text-slate-400">{statusLabel}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </header>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
