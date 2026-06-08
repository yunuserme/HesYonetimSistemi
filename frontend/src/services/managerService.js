import { apiRequest } from "./apiClient.js";

const OFFLINE_STATUSES = new Set(["STOPPED", "OFFLINE", "INACTIVE", "DURDURULDU"]);
const FAULT_STATUSES = new Set(["WARNING", "FAULT", "ERROR", "CRITICAL"]);
const OPEN_WORK_ORDER_STATUSES = new Set(["OPEN", "PENDING", "ACCEPTED", "IN_PROGRESS"]);

function roundTo(value, decimals = 1) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Number(numericValue.toFixed(decimals));
}

function normalizeStatus(status) {
  return String(status ?? "").trim().replace(/\s+/g, "_").toUpperCase();
}

function isAlarmActive(alarm) {
  if (alarm.resolved === false) {
    return true;
  }

  if (alarm.resolved === true) {
    return false;
  }

  const status = normalizeStatus(alarm.status);

  return status === "ACTIVE" || status === "OPEN" || status === "PENDING";
}

function isAlarmResolved(alarm) {
  if (alarm.resolved === true) {
    return true;
  }

  return normalizeStatus(alarm.status) === "RESOLVED";
}

function isOpenWorkOrder(workOrder) {
  return OPEN_WORK_ORDER_STATUSES.has(normalizeStatus(workOrder.status));
}

function getAverageResolutionMinutes(workOrders) {
  const completedDurations = workOrders
    .filter((workOrder) => workOrder.created_at && workOrder.closed_at)
    .map((workOrder) => {
      const createdAt = new Date(workOrder.created_at).getTime();
      const closedAt = new Date(workOrder.closed_at).getTime();

      if (Number.isNaN(createdAt) || Number.isNaN(closedAt) || closedAt < createdAt) {
        return null;
      }

      return (closedAt - createdAt) / 60000;
    })
    .filter((duration) => Number.isFinite(duration));

  if (!completedDurations.length) {
    return null;
  }

  return roundTo(
    completedDurations.reduce((total, duration) => total + duration, 0) / completedDurations.length,
    0,
  );
}

function buildSystemStatus(liveData, activeAlarms, faultyTurbines) {
  const criticalAlarmCount = activeAlarms.filter(
    (alarm) => normalizeStatus(alarm.severity) === "CRITICAL",
  ).length;

  if (criticalAlarmCount || faultyTurbines > 0) {
    return {
      label: "System Status",
      value: "Warning",
      unit: "",
      trend: `${criticalAlarmCount} critical alarms, ${faultyTurbines} faulty turbines`,
      tone: "amber",
    };
  }

  return {
    label: "System Status",
    value: "Operational",
    unit: "",
    trend: `${roundTo(liveData.total_power_mw, 1)} MW live output, ${activeAlarms.length} active alarms`,
    tone: activeAlarms.length ? "amber" : "emerald",
  };
}

function buildProductionMetrics(liveData, energyMetrics) {
  return [
    {
      id: "currentProduction",
      label: "Current Production",
      value: roundTo(liveData.total_power_mw, 1),
      unit: "MW",
      trend: "Live total power from SCADA",
      tone: "emerald",
    },
    {
      id: "weeklyProduction",
      label: "Weekly Production",
      value: "N/A",
      unit: "",
      trend: "Backend aggregate endpoint missing",
      tone: "sky",
    },
    {
      id: "monthlyProduction",
      label: "Monthly Production",
      value: "N/A",
      unit: "",
      trend: "Backend aggregate endpoint missing",
      tone: "violet",
    },
    {
      id: "energyModelSamples",
      label: "Energy Model Samples",
      value: Number(energyMetrics.sample_count ?? 0),
      unit: "",
      trend: energyMetrics.model_ready ? "Energy model ready" : "Energy model not ready",
      tone: energyMetrics.model_ready ? "emerald" : "amber",
    },
  ];
}

function buildTurbineMetrics(liveData) {
  const turbines = Array.isArray(liveData.turbines) ? liveData.turbines : [];
  const activeTurbines = Number(liveData.active_turbine_count ?? 0);
  const offlineTurbines = turbines.filter((turbine) => {
    const status = normalizeStatus(turbine.status);

    return turbine.is_active === false || OFFLINE_STATUSES.has(status);
  }).length;
  const faultyTurbines = turbines.filter((turbine) =>
    FAULT_STATUSES.has(normalizeStatus(turbine.status)),
  ).length;

  return {
    faultyTurbines,
    metrics: [
      {
        id: "activeTurbines",
        label: "Active Turbines",
        value: activeTurbines,
        unit: "",
        trend: `${turbines.length} turbines reported`,
        tone: "emerald",
      },
      {
        id: "offlineTurbines",
        label: "Offline Turbines",
        value: offlineTurbines,
        unit: "",
        trend: "Stopped, offline, or inactive turbines",
        tone: offlineTurbines ? "amber" : "emerald",
      },
      {
        id: "faultyTurbines",
        label: "Faulty Turbines",
        value: faultyTurbines,
        unit: "",
        trend: "Warning, fault, error, or critical status",
        tone: faultyTurbines ? "violet" : "emerald",
      },
    ],
  };
}

function buildFaultMetrics(alarms, workOrders) {
  const activeFaults = alarms.filter(isAlarmActive).length;
  const resolvedFaults = alarms.filter(isAlarmResolved).length;
  const pendingFaults = workOrders.filter(isOpenWorkOrder).length;
  const averageResolutionMinutes = getAverageResolutionMinutes(workOrders);

  return [
    {
      id: "activeFaults",
      label: "Active Faults",
      value: activeFaults,
      unit: "",
      trend: "Unresolved alarms from backend",
      tone: activeFaults ? "amber" : "emerald",
    },
    {
      id: "resolvedFaults",
      label: "Resolved Faults",
      value: resolvedFaults,
      unit: "",
      trend: "Resolved alarm records",
      tone: "emerald",
    },
    {
      id: "pendingFaults",
      label: "Open Work Orders",
      value: pendingFaults,
      unit: "",
      trend: "Work orders not completed",
      tone: pendingFaults ? "sky" : "emerald",
    },
    {
      id: "averageResolutionTime",
      label: "Average Resolution Time",
      value: averageResolutionMinutes ?? "N/A",
      unit: averageResolutionMinutes == null ? "" : "min",
      trend: averageResolutionMinutes == null
        ? "No completed work orders with closed_at"
        : "Average created_at to closed_at",
      tone: averageResolutionMinutes == null ? "amber" : "violet",
    },
  ];
}

export async function getManagerDashboardData() {
  const [liveData, alarms, workOrders, energyMetrics] = await Promise.all([
    apiRequest("/api/scada/live", { auth: true }),
    apiRequest("/alarms/", { auth: true }),
    apiRequest("/work-orders/", { auth: true }),
    apiRequest("/energy/metrics", { auth: true }),
  ]);
  const safeAlarms = Array.isArray(alarms) ? alarms : [];
  const safeWorkOrders = Array.isArray(workOrders) ? workOrders : [];
  const turbineSummary = buildTurbineMetrics(liveData);
  const activeAlarms = safeAlarms.filter(isAlarmActive);

  return {
    production: buildProductionMetrics(liveData, energyMetrics ?? {}),
    turbines: turbineSummary.metrics,
    faults: buildFaultMetrics(safeAlarms, safeWorkOrders),
    systemStatus: buildSystemStatus(liveData, activeAlarms, turbineSummary.faultyTurbines),
  };
}
