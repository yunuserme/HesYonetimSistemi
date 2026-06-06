const toneClasses = {
  sky: {
    border: "border-sky-200",
    icon: "bg-sky-100 text-sky-700",
    trend: "text-sky-700",
  },
  emerald: {
    border: "border-emerald-200",
    icon: "bg-emerald-100 text-emerald-700",
    trend: "text-emerald-700",
  },
  amber: {
    border: "border-amber-200",
    icon: "bg-amber-100 text-amber-700",
    trend: "text-amber-700",
  },
  violet: {
    border: "border-violet-200",
    icon: "bg-violet-100 text-violet-700",
    trend: "text-violet-700",
  },
};

export default function MetricCard({ label, value, unit, trend, tone = "sky", icon: Icon }) {
  const classes = toneClasses[tone] ?? toneClasses.sky;

  return (
    <article className={`rounded-lg border ${classes.border} bg-white p-5 shadow-soft`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-normal text-slate-950">
              {value}
            </span>
            {unit ? <span className="text-sm font-semibold text-slate-500">{unit}</span> : null}
          </div>
        </div>
        {Icon ? (
          <div className={`rounded-lg p-3 ${classes.icon}`} aria-hidden="true">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
      <p className={`mt-4 text-sm font-medium ${classes.trend}`}>{trend}</p>
    </article>
  );
}
