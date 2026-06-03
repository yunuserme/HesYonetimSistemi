export const dashboardMetrics = [
  {
    id: "current-output",
    label: "Current Output",
    value: "45.2",
    unit: "MW",
    trend: "+1.8 MW from last hour",
    tone: "sky",
  },
  {
    id: "system-efficiency",
    label: "System Efficiency",
    value: "91.6",
    unit: "%",
    trend: "Normal operating range",
    tone: "emerald",
  },
  {
    id: "active-alerts",
    label: "Active Alerts",
    value: "3",
    unit: "",
    trend: "1 warning, 2 review",
    tone: "amber",
  },
  {
    id: "tasks-completed",
    label: "Tasks Completed",
    value: "12",
    unit: "",
    trend: "4 scheduled today",
    tone: "violet",
  },
];

export const powerOutputLast24Hours = [
  { time: "00:00", output: 39.8 },
  { time: "02:00", output: 38.9 },
  { time: "04:00", output: 38.1 },
  { time: "06:00", output: 41.6 },
  { time: "08:00", output: 44.2 },
  { time: "10:00", output: 47.5 },
  { time: "12:00", output: 50.8 },
  { time: "14:00", output: 52.6 },
  { time: "16:00", output: 51.2 },
  { time: "18:00", output: 48.7 },
  { time: "20:00", output: 45.2 },
  { time: "22:00", output: 42.5 },
];

export const weeklyEnergyProduction = [
  { day: "Mon", energy: 1018 },
  { day: "Tue", energy: 1056 },
  { day: "Wed", energy: 992 },
  { day: "Thu", energy: 1084 },
  { day: "Fri", energy: 1116 },
  { day: "Sat", energy: 1032 },
  { day: "Sun", energy: 1098 },
];

export const forecastRanges = {
  "24h": {
    rows: [
      { date: "2026-06-03 00:00", day: "Today 00:00", turbine: "Turbine 1", predicted: 41.2, actual: 40.6 },
      { date: "2026-06-03 04:00", day: "Today 04:00", turbine: "Turbine 2", predicted: 39.8, actual: 38.1 },
      { date: "2026-06-03 08:00", day: "Today 08:00", turbine: "Turbine 3", predicted: 46.4, actual: 45.8 },
      { date: "2026-06-03 12:00", day: "Today 12:00", turbine: "Turbine 1", predicted: 52.1, actual: 51.3 },
      { date: "2026-06-03 16:00", day: "Today 16:00", turbine: "Turbine 2", predicted: 55.0, actual: 50.9 },
      { date: "2026-06-03 20:00", day: "Today 20:00", turbine: "Turbine 3", predicted: 50.2, actual: 49.6 },
    ],
  },
  "7d": {
    rows: [
      { date: "2026-05-28", day: "Thursday", turbine: "Turbine 1", predicted: 50.2, actual: 49.8 },
      { date: "2026-05-28", day: "Thursday", turbine: "Turbine 2", predicted: 48.7, actual: 47.0 },
      { date: "2026-05-29", day: "Friday", turbine: "Turbine 1", predicted: 52.1, actual: 53.0 },
      { date: "2026-05-29", day: "Friday", turbine: "Turbine 3", predicted: 49.4, actual: 48.9 },
      { date: "2026-05-30", day: "Saturday", turbine: "Turbine 2", predicted: 47.4, actual: 46.9 },
      { date: "2026-05-31", day: "Sunday", turbine: "Turbine 3", predicted: 50.0, actual: 47.3 },
      { date: "2026-06-01", day: "Monday", turbine: "Turbine 1", predicted: 46.8, actual: 45.9 },
      { date: "2026-06-02", day: "Tuesday", turbine: "Turbine 2", predicted: 48.5, actual: 49.1 },
      { date: "2026-06-03", day: "Wednesday", turbine: "Turbine 3", predicted: 45.4, actual: 44.7 },
    ],
  },
};
