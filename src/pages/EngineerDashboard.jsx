import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "../components/ChartCard.jsx";
import MetricCard from "../components/MetricCard.jsx";
import { getEngineerDashboardData } from "../services/energyService.js";

const metricIcons = {
  "current-output": Zap,
  "system-efficiency": Gauge,
  "active-alerts": AlertTriangle,
  "tasks-completed": CheckCircle2,
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-slate-950">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="mt-1 text-slate-600">
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function EngineerDashboard() {
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    let isMounted = true;

    getEngineerDashboardData().then((data) => {
      if (isMounted) {
        setDashboardData(data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!dashboardData) {
    return (
      <div className="grid min-h-[60vh] place-items-center rounded-lg border border-slate-200 bg-white">
        <p className="text-sm font-semibold text-slate-500">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="engineer-dashboard">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">
            CURRENT ROLE: Energy Planning Engineer
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
            Engineer Dashboard
          </h1>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-500">
          Hydroelectric plant operations overview for output, efficiency, alerts, and maintenance tasks.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardData.metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            {...metric}
            icon={metricIcons[metric.id]}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Power Output - Last 24 Hours"
          subtitle="Measured turbine output in megawatts."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dashboardData.powerOutputLast24Hours} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="output"
                name="Output MW"
                stroke="#0284c7"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Weekly Energy Production"
          subtitle="Daily energy production in MWh."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboardData.weeklyEnergyProduction} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="energy" name="Energy MWh" fill="#059669" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>
    </div>
  );
}
