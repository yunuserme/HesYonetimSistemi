import { Activity, AlertTriangle, CheckCircle2, Gauge, Thermometer, Waves, Zap } from "lucide-react";

const statusClasses = {
  normal: {
    border: "border-emerald-200",
    icon: "bg-emerald-100 text-emerald-700",
    status: "text-emerald-700",
    value: "text-slate-950",
  },
  warning: {
    border: "border-amber-200",
    icon: "bg-amber-100 text-amber-700",
    status: "text-amber-700",
    value: "text-slate-950",
  },
  critical: {
    border: "border-rose-200",
    icon: "bg-rose-100 text-rose-700",
    status: "text-rose-700",
    value: "text-rose-950",
  },
  offline: {
    border: "border-slate-200",
    icon: "bg-slate-100 text-slate-500",
    status: "text-slate-500",
    value: "text-slate-500",
  },
};

const sensorIcons = {
  "water-level": Waves,
  "turbine-rpm": Gauge,
  "turbine-temperature": Thermometer,
  "instant-production": Zap,
  "system-status": CheckCircle2,
  "active-alarms": AlertTriangle,
  RPM: Gauge,
  TEMPERATURE: Thermometer,
  WATER: Waves,
  POWER: Zap,
  VIBRATION: Activity,
};

export default function SensorCard({ sensor, onViewHistory }) {
  const classes = statusClasses[sensor.statusLevel] ?? statusClasses.normal;
  const Icon = sensorIcons[sensor.id] ?? sensorIcons[sensor.sensorType] ?? Activity;

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onViewHistory(sensor);
    }
  }

  return (
    <article
      className={`cursor-pointer rounded-lg border ${classes.border} bg-white p-5 shadow-soft transition hover:border-slate-400`}
      onClick={() => onViewHistory(sensor)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{sensor.label}</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-2">
            <span className={`text-2xl font-semibold tracking-normal ${classes.value}`}>
              {sensor.value}
            </span>
            {sensor.unit ? (
              <span className="text-sm font-semibold text-slate-500">{sensor.unit}</span>
            ) : null}
          </div>
        </div>
        <div className={`rounded-lg p-3 ${classes.icon}`} aria-hidden="true">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className={`mt-4 text-sm font-semibold ${classes.status}`}>{sensor.status}</p>
    </article>
  );
}
