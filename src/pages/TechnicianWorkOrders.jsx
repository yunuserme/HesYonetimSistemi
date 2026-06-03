import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  Play,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import MetricCard from "../components/MetricCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  acceptWorkOrder,
  completeWorkOrder,
  getWorkOrders,
  startWorkOrder,
} from "../services/workOrderService.js";
import { formatDateTime } from "../utils/dateFormat.js";

const statusClasses = {
  Pending: "bg-amber-100 text-amber-800",
  Accepted: "bg-sky-100 text-sky-700",
  "In Progress": "bg-violet-100 text-violet-700",
  Completed: "bg-emerald-100 text-emerald-700",
};

const priorityClasses = {
  HIGH: "bg-rose-100 text-rose-700",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-slate-100 text-slate-700",
};

function WorkOrderAction({ workOrder, onError, onUpdate }) {
  const [isUpdating, setIsUpdating] = useState(false);

  async function runAction(action) {
    setIsUpdating(true);
    onError("");

    try {
      const updatedWorkOrder = await action(workOrder);
      onUpdate(updatedWorkOrder);
    } catch (actionError) {
      onError(actionError.message || "Work order could not be updated.");
    } finally {
      setIsUpdating(false);
    }
  }

  if (workOrder.uiStatus === "Pending") {
    return (
      <button
        type="button"
        onClick={() => runAction(acceptWorkOrder)}
        disabled={isUpdating}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        <ShieldCheck className="h-4 w-4" />
        Accept
      </button>
    );
  }

  if (workOrder.uiStatus === "Accepted") {
    return (
      <button
        type="button"
        onClick={() => runAction(startWorkOrder)}
        disabled={isUpdating}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        <Play className="h-4 w-4" />
        Start
      </button>
    );
  }

  if (workOrder.uiStatus === "In Progress") {
    return (
      <button
        type="button"
        onClick={() => runAction(completeWorkOrder)}
        disabled={isUpdating}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        <CheckCircle2 className="h-4 w-4" />
        Complete
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
      <CheckCircle2 className="h-4 w-4" />
      Completed
    </div>
  );
}

function WorkOrderCard({ workOrder, onError, onUpdate }) {
  const createdAt = formatDateTime(workOrder.created_at);
  const dueAt = formatDateTime(workOrder.due_at);
  const completedAt = formatDateTime(workOrder.closed_at);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                statusClasses[workOrder.uiStatus] ?? "bg-slate-100 text-slate-700"
              }`}
            >
              {workOrder.uiStatus}
            </span>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                priorityClasses[workOrder.priority] ?? "bg-slate-100 text-slate-700"
              }`}
            >
              {workOrder.priority}
            </span>
          </div>

          <h2 className="mt-3 text-lg font-semibold text-slate-950">{workOrder.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {workOrder.description || "No description provided."}
          </p>
        </div>

        <div className="shrink-0">
          <WorkOrderAction workOrder={workOrder} onError={onError} onUpdate={onUpdate} />
        </div>
      </div>

      <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
            Created
          </dt>
          <dd className="mt-1 text-sm font-semibold text-slate-700">
            {createdAt ?? "Unknown"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
            Due
          </dt>
          <dd className="mt-1 text-sm font-semibold text-slate-700">
            {dueAt ?? "No due date"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
            Completed
          </dt>
          <dd className="mt-1 text-sm font-semibold text-slate-700">
            {completedAt ?? "Not completed yet"}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export default function TechnicianWorkOrders() {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState([]);
  const [dataSource, setDataSource] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadWorkOrders() {
      setIsLoading(true);
      setError("");

      try {
        const result = await getWorkOrders();
        const assignedWorkOrders = result.items.filter(
          (workOrder) => Number(workOrder.assigned_to) === Number(user.id),
        );

        if (isMounted) {
          setWorkOrders(assignedWorkOrders);
          setDataSource(result.source);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Work orders could not be loaded.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadWorkOrders();

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  const summary = useMemo(() => {
    const counts = {
      Pending: 0,
      Accepted: 0,
      "In Progress": 0,
      Completed: 0,
    };

    workOrders.forEach((workOrder) => {
      counts[workOrder.uiStatus] = (counts[workOrder.uiStatus] ?? 0) + 1;
    });

    return counts;
  }, [workOrders]);

  function handleUpdate(updatedWorkOrder) {
    setError("");
    setWorkOrders((current) =>
      current.map((workOrder) =>
        workOrder.id === updatedWorkOrder.id ? updatedWorkOrder : workOrder,
      ),
    );
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center rounded-lg border border-slate-200 bg-white">
        <p className="text-sm font-semibold text-slate-500">Loading work orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="technician-work-orders">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">
            CURRENT ROLE: Field Technician
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
            My Work Orders
          </h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
          <Wrench className="h-4 w-4 text-emerald-700" />
          {dataSource === "api" ? "Live data" : "Offline mode"}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Pending"
          value={summary.Pending}
          unit=""
          trend="Waiting for acceptance"
          tone="amber"
          icon={Clock3}
        />
        <MetricCard
          label="Accepted"
          value={summary.Accepted}
          unit=""
          trend="Ready to start"
          tone="sky"
          icon={ShieldCheck}
        />
        <MetricCard
          label="In Progress"
          value={summary["In Progress"]}
          unit=""
          trend="Currently active"
          tone="violet"
          icon={Wrench}
        />
        <MetricCard
          label="Completed"
          value={summary.Completed}
          unit=""
          trend="Closed work orders"
          tone="emerald"
          icon={ClipboardCheck}
        />
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="space-y-4">
        {workOrders.length ? (
          workOrders.map((workOrder) => (
            <WorkOrderCard
              key={workOrder.id}
              workOrder={workOrder}
              onError={setError}
              onUpdate={handleUpdate}
            />
          ))
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-soft">
            No assigned work orders.
          </div>
        )}
      </section>
    </div>
  );
}
