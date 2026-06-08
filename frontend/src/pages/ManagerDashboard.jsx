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
import { createWorkOrder } from "../services/workOrderService.js";

const priorityOptions = ["LOW", "MEDIUM", "HIGH"];

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [createdWorkOrder, setCreatedWorkOrder] = useState(null);

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

  async function handleCreateWorkOrder(event) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedAssignedTo = String(assignedTo).trim();
    const assignedToNumber = Number(trimmedAssignedTo);

    setFormError("");
    setFormSuccess("");
    setCreatedWorkOrder(null);

    if (!trimmedTitle) {
      setFormError("Title is required.");
      return;
    }

    if (!trimmedAssignedTo) {
      setFormError("Technician User ID is required.");
      return;
    }

    if (!Number.isFinite(assignedToNumber)) {
      setFormError("Technician User ID must be a number.");
      return;
    }

    const dueAtIso = dueAt ? new Date(dueAt).toISOString() : null;
    const payload = {
      title: trimmedTitle,
      description: description.trim() || null,
      priority,
      assigned_to: assignedToNumber,
      due_at: dueAtIso,
    };

    setFormLoading(true);

    try {
      const created = await createWorkOrder(payload);

      setCreatedWorkOrder(created);
      setFormSuccess("Work order created successfully.");
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setAssignedTo("");
      setDueAt("");
    } catch (submitError) {
      setFormError(submitError.message || "Work order could not be created.");
    } finally {
      setFormLoading(false);
    }
  }

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

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Assign Work Order</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a pending work order and assign it to a technician user.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            <Wrench className="h-4 w-4" />
            ADMIN / MANAGER
          </div>
        </div>

        <form className="mt-5 grid gap-4 lg:grid-cols-2" onSubmit={handleCreateWorkOrder}>
          <label className="block text-sm font-semibold text-slate-700">
            Title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              placeholder="Inspection or repair title"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Technician User ID
            <input
              type="number"
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              placeholder="Technician user id"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Priority
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              {priorityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Due At
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              placeholder="Optional details for the technician"
            />
          </label>

          {formError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 lg:col-span-2">
              {formError}
            </div>
          ) : null}

          {formSuccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 lg:col-span-2">
              {formSuccess}
            </div>
          ) : null}

          {createdWorkOrder ? (
            <dl className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm lg:col-span-2 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                  Title
                </dt>
                <dd className="mt-1 font-semibold text-slate-700">{createdWorkOrder.title}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                  Status
                </dt>
                <dd className="mt-1 font-semibold text-slate-700">
                  {createdWorkOrder.uiStatus ?? createdWorkOrder.status}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                  Assigned To
                </dt>
                <dd className="mt-1 font-semibold text-slate-700">
                  {createdWorkOrder.assigned_to}
                </dd>
              </div>
            </dl>
          ) : null}

          <div className="flex justify-end lg:col-span-2">
            <button
              type="submit"
              disabled={formLoading}
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
            >
              <Wrench className="h-4 w-4" />
              {formLoading ? "Creating..." : "Create Work Order"}
            </button>
          </div>
        </form>
      </section>

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
