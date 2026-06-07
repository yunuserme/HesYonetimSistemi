import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";

const toneClasses = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

export default function ScadaStatusBar({ status }) {
  const statusClass = toneClasses[status.tone] ?? toneClasses.emerald;

  return (
    <div className={`rounded-lg border px-4 py-3 ${statusClass}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/70 p-2" aria-hidden="true">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{status.label}</p>
            <p className="mt-0.5 text-lg font-semibold tracking-normal">{status.value}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2">
            <Activity className="h-4 w-4" />
            Son guncelleme: {status.lastUpdated}
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2">
            <AlertTriangle className="h-4 w-4" />
            Aktif alarm: {status.activeAlarmCount}
          </span>
        </div>
      </div>
    </div>
  );
}
