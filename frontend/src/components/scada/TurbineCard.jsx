import { AlertTriangle, Gauge, Power, Thermometer, Zap } from "lucide-react";

const statusClasses = {
  RUNNING: "bg-emerald-100 text-emerald-700",
  STANDBY: "bg-amber-100 text-amber-800",
  STOPPED: "bg-slate-100 text-slate-700",
  DURDURULDU: "bg-slate-100 text-slate-700",
};

const healthClasses = {
  normal: {
    border: "border-emerald-200",
    icon: "bg-emerald-100 text-emerald-700",
    text: "text-slate-950",
    progress: "bg-emerald-600",
    label: "Normal",
    labelClass: "bg-emerald-100 text-emerald-700",
  },
  warning: {
    border: "border-amber-200",
    icon: "bg-amber-100 text-amber-700",
    text: "text-slate-950",
    progress: "bg-amber-500",
    label: "Warning",
    labelClass: "bg-amber-100 text-amber-800",
  },
  critical: {
    border: "border-rose-200",
    icon: "bg-rose-100 text-rose-700",
    text: "text-rose-950",
    progress: "bg-rose-600",
    label: "Critical",
    labelClass: "bg-rose-100 text-rose-700",
  },
  offline: {
    border: "border-slate-200",
    icon: "bg-slate-100 text-slate-500",
    text: "text-slate-500",
    progress: "bg-slate-300",
    label: "Offline",
    labelClass: "bg-slate-100 text-slate-600",
  },
};

export default function TurbineCard({ turbine, onEmergencyStop, onViewHistory }) {
  const classes = healthClasses[turbine.statusLevel] ?? healthClasses.normal;
  const isStopped = turbine.status === "DURDURULDU" || turbine.status === "STOPPED";

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onViewHistory(turbine);
    }
  }

  return (
    <article
      className={`cursor-pointer rounded-lg border ${classes.border} bg-white p-5 shadow-soft transition hover:border-slate-400`}
      onClick={() => onViewHistory(turbine)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{turbine.name}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                statusClasses[turbine.status] ?? statusClasses.STOPPED
              }`}
            >
              {turbine.status}
            </span>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes.labelClass}`}>
              {classes.label}
            </span>
          </div>
        </div>
        <div className={`rounded-lg p-3 ${classes.icon}`} aria-hidden="true">
          <Power className="h-5 w-5" />
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="inline-flex items-center gap-2 text-slate-500">
            <Gauge className="h-4 w-4" />
            RPM
          </dt>
          <dd className={`font-semibold ${classes.text}`}>{turbine.rpm}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="inline-flex items-center gap-2 text-slate-500">
            <Thermometer className="h-4 w-4" />
            Sicaklik
          </dt>
          <dd className={`font-semibold ${classes.text}`}>{turbine.temperature} C</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="inline-flex items-center gap-2 text-slate-500">
            <Zap className="h-4 w-4" />
            Uretim
          </dt>
          <dd className={`font-semibold ${classes.text}`}>{turbine.powerOutput} MW</dd>
        </div>
        {turbine.lastUpdated ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Son guncelleme</dt>
            <dd className="font-semibold text-slate-500">{turbine.lastUpdated}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Yuk</span>
          <span>{turbine.loadPercent}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-100">
          <div
            className={`h-2 rounded-full ${classes.progress}`}
            style={{ width: `${turbine.loadPercent}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEmergencyStop(turbine.id);
        }}
        onKeyDown={(event) => event.stopPropagation()}
        disabled={isStopped}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
      >
        <AlertTriangle className="h-4 w-4" />
        {isStopped ? "Durduruldu" : "Acil Durdur"}
      </button>
    </article>
  );
}
