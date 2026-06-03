export const managerProductionMetrics = [
  {
    id: "todayProduction",
    label: "Today's Production",
    value: "1,084",
    unit: "MWh",
    trend: "+4.8% against plan",
    tone: "emerald",
  },
  {
    id: "weeklyProduction",
    label: "Weekly Production",
    value: "7,396",
    unit: "MWh",
    trend: "Stable weekly output",
    tone: "sky",
  },
  {
    id: "monthlyProduction",
    label: "Monthly Production",
    value: "31,860",
    unit: "MWh",
    trend: "92% of monthly target",
    tone: "violet",
  },
];

export const managerTurbineMetrics = [
  {
    id: "activeTurbines",
    label: "Active Turbines",
    value: 8,
    unit: "",
    trend: "Generating normally",
    tone: "emerald",
  },
  {
    id: "offlineTurbines",
    label: "Offline Turbines",
    value: 1,
    unit: "",
    trend: "Scheduled maintenance",
    tone: "amber",
  },
  {
    id: "faultyTurbines",
    label: "Faulty Turbines",
    value: 1,
    unit: "",
    trend: "Awaiting field check",
    tone: "violet",
  },
];

export const managerFaultMetrics = [
  {
    id: "activeFaults",
    label: "Active Faults",
    value: 3,
    unit: "",
    trend: "1 critical, 2 warning",
    tone: "amber",
  },
  {
    id: "resolvedFaults",
    label: "Resolved Faults",
    value: 18,
    unit: "",
    trend: "Last 7 days",
    tone: "emerald",
  },
  {
    id: "pendingFaults",
    label: "Pending Faults",
    value: 5,
    unit: "",
    trend: "Assigned to technicians",
    tone: "sky",
  },
  {
    id: "averageResponseTime",
    label: "Average Response Time",
    value: "42",
    unit: "min",
    trend: "Under SLA target",
    tone: "violet",
  },
];

export const managerSystemStatus = {
  label: "System Status",
  value: "Operational",
  unit: "",
  trend: "Plant load, turbine health, and fault response are within acceptable limits.",
  tone: "emerald",
};
