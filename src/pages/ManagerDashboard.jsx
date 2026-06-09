import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gauge,
  Power,
  ShieldCheck,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import MetricCard from "../components/MetricCard.jsx";
import { getManagerDashboardData } from "../services/managerService.js";

const metricIcons = {
  currentProduction: Zap,
  weeklyProduction: TrendingUp,
  monthlyProduction: Gauge,
  energyModelSamples: Activity,
  activeTurbines: Power,
  offlineTurbines: Clock3,
  faultyTurbines: Wrench,
  activeFaults: AlertTriangle,
  resolvedFaults: CheckCircle2,
  pendingFaults: Activity,
  averageResponseTime: Clock3,
};

function MetricSection({ title, subtitle, metrics = [] }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {metrics.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.id}
              {...metric}
              icon={metricIcons[metric.id]}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-soft">
          No manager metrics are available for this section.
        </div>
      )}
    </section>
  );
}

export default function ManagerDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    getManagerDashboardData()
      .then((data) => {
        if (isMounted) {
          setDashboardData(data);
          setError("");
        }
      })
      .catch((loadError) => {
        console.error("Manager dashboard data could not be loaded.", loadError);

        if (isMounted) {
          setError(loadError.message || "Manager dashboard data could not be loaded.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!dashboardData && !error) {
    return (
      <div className="grid min-h-[60vh] place-items-center rounded-lg border border-slate-200 bg-white">
        <p className="text-sm font-semibold text-slate-500">Loading manager dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="manager-dashboard">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">
            CURRENT ROLE: Operations Manager
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
            Manager Dashboard
          </h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-soft">
          <ShieldCheck className="h-4 w-4 text-emerald-700" />
          Live data
        </div>
      </header>

      {dashboardData.systemStatus ? (
        <MetricCard
          {...dashboardData.systemStatus}
          icon={ShieldCheck}
        />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-soft">
          System status is not available.
        </div>
      )}

      <MetricSection
        title="Production"
        subtitle="Live production and available backend energy model indicators."
        metrics={dashboardData.production ?? []}
      />

      <MetricSection
        title="Turbines"
        subtitle="Current operational availability across the plant."
        metrics={dashboardData.turbines ?? []}
      />

      <MetricSection
        title="Fault Response"
        subtitle="Alarm workload and work order resolution indicators."
        metrics={dashboardData.faults ?? []}
      />
    </div>
  );
}
