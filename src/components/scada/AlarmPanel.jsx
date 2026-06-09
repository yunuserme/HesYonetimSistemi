import { AlertTriangle, Info } from "lucide-react";

const severityClasses = {
  WARNING: "bg-amber-100 text-amber-800",
  INFO: "bg-sky-100 text-sky-700",
  CRITICAL: "bg-rose-100 text-rose-700",
};

export default function AlarmPanel({ alarms = [] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Alarm Paneli</h2>
          <p className="mt-1 text-sm text-slate-500">Aktif SCADA uyarilari ve izleme notlari.</p>
        </div>
        <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-soft">
          {alarms.length} aktif
        </span>
      </div>

      <div className="space-y-3">
        {alarms.map((alarm) => {
          const Icon = alarm.severity === "WARNING" || alarm.severity === "CRITICAL"
            ? AlertTriangle
            : Info;

          return (
            <article key={alarm.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-700" aria-hidden="true">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          severityClasses[alarm.severity] ?? severityClasses.INFO
                        }`}
                      >
                        {alarm.severity}
                      </span>
                      <span className="text-sm font-semibold text-slate-700">{alarm.turbine}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{alarm.message}</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-400">{alarm.time}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
