import { X } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const rangeLabels = {
  "10m": "Son 10 Dakika",
  "1h": "Son 1 Saat",
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-slate-950">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="mt-1 text-slate-600">
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function ScadaChartModal({
  data = [],
  loading = false,
  error = "",
  source = "api",
  selectedRange,
  selectedTarget,
  onClose,
  onRangeChange,
}) {
  if (!selectedTarget) {
    return null;
  }

  const showVibration = selectedTarget.type === "turbine";

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 px-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-lg border border-slate-200 bg-white shadow-soft">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">
              SCADA Gecmis Veri
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">{selectedTarget.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
            aria-label="Modal kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {Object.entries(rangeLabels).map(([rangeKey, label]) => (
              <button
                key={rangeKey}
                type="button"
                onClick={() => onRangeChange(rangeKey)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  selectedRange === rangeKey
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
            <span
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                source === "api"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {source === "api"
                ? "API gecmis verisi kullaniliyor"
                : "Backend gecmis verisi yuklenemedi."}
            </span>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="grid h-80 place-items-center rounded-lg border border-slate-200 bg-slate-50">
              <p className="text-sm font-semibold text-slate-500">Gecmis veri yukleniyor...</p>
            </div>
          ) : data.length ? (
            <div className="h-[24rem] rounded-lg border border-slate-200 bg-white p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="rpm" name="RPM" stroke="#0284c7" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="temperature" name="Sicaklik" stroke="#dc2626" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="waterLevel" name="Su Seviyesi" stroke="#059669" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="powerMw" name="MW Uretim" stroke="#7c3aed" strokeWidth={2} dot={false} />
                  {showVibration ? (
                    <Line type="monotone" dataKey="vibration" name="Titresim" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="grid h-80 place-items-center rounded-lg border border-slate-200 bg-slate-50">
              <p className="text-sm font-semibold text-slate-500">Gecmis veri bulunamadi.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
