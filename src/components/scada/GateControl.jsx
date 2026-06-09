import { CheckCircle2, LockKeyhole, Waves, X } from "lucide-react";

const statusClasses = {
  OPEN: "bg-emerald-100 text-emerald-700",
  PARTIAL: "bg-amber-100 text-amber-800",
  CLOSED: "bg-slate-100 text-slate-700",
};

const riskClasses = {
  normal: {
    border: "border-slate-200",
    progress: "bg-sky-600",
    badge: "bg-emerald-100 text-emerald-700",
    label: "Normal",
  },
  warning: {
    border: "border-amber-200",
    progress: "bg-amber-500",
    badge: "bg-amber-100 text-amber-800",
    label: "Warning",
  },
  critical: {
    border: "border-rose-200",
    progress: "bg-rose-600",
    badge: "bg-rose-100 text-rose-700",
    label: "Critical",
  },
};

function getGateRisk(positionPercent) {
  if (positionPercent > 80) {
    return "critical";
  }

  if (positionPercent >= 60) {
    return "warning";
  }

  return "normal";
}

export default function GateControl({
  gates = [],
  selectedGateId,
  targetPercent,
  pendingUpdate,
  isProcessing = false,
  supervisorCode,
  error,
  supervisorError,
  successMessage,
  onCancelGateUpdate,
  onGateSelect,
  onGateUpdate,
  onPrepareGateClose,
  onPrepareGateUpdate,
  onSupervisorCodeChange,
  onTargetPercentChange,
}) {
  const selectedGate = gates.find((gate) => gate.id === selectedGateId);
  const pendingRisk = pendingUpdate ? getGateRisk(pendingUpdate.newPercent) : "normal";
  const requiresSupervisorCode = pendingUpdate?.newPercent > 80;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Savak Kapaklari</h2>
          <p className="mt-1 text-sm text-slate-500">Kapak pozisyonlari icin backend endpoint destegi bekleniyor.</p>
        </div>
        {successMessage ? (
          <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {gates.map((gate) => {
          const risk = getGateRisk(gate.positionPercent);
          const classes = riskClasses[risk];
          const isSelected = gate.id === selectedGateId;

          return (
            <button
              key={gate.id}
              type="button"
              onClick={() => onGateSelect(gate.id)}
              className={`rounded-lg border bg-white p-5 text-left shadow-soft transition hover:border-slate-400 ${
                isSelected ? "border-slate-950 ring-2 ring-slate-950/10" : classes.border
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">{gate.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        statusClasses[gate.status] ?? statusClasses.CLOSED
                      }`}
                    >
                      {gate.status}
                    </span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes.badge}`}>
                      {classes.label}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-sky-100 p-3 text-sky-700" aria-hidden="true">
                  <Waves className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Kapak Acikligi</span>
                  <span>{gate.positionPercent}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${classes.progress}`}
                    style={{ width: `${gate.positionPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                <span className="text-slate-500">Debi</span>
                <span className="font-semibold text-slate-950">{gate.flowRate} m3/s</span>
              </div>
            </button>
          );
        })}
      </div>

      {!gates.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-soft">
          Backend endpoint eksik: savak kapagi listesi.
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Yeni aciklik yuzdesi</span>
            <input
              type="number"
              min="0"
              max="100"
              value={targetPercent}
              onChange={(event) => onTargetPercentChange(event.target.value)}
              placeholder={selectedGate ? `${selectedGate.positionPercent}` : "Kapak sec"}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950"
            />
          </label>
          <button
            type="button"
            onClick={onPrepareGateUpdate}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Waves className="h-4 w-4" />
            Kapak Ac / Guncelle
          </button>
          <button
            type="button"
            onClick={onPrepareGateClose}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
            Kapak Kapat
          </button>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
            {error}
          </p>
        ) : null}
      </div>

      {pendingUpdate ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/40 px-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Savak Kapagi Onayi</h2>
                <p className="mt-1 text-sm text-slate-500">Backend guncellemesi onay bekliyor.</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${riskClasses[pendingRisk].badge}`}>
                {riskClasses[pendingRisk].label}
              </span>
            </div>

            <dl className="mt-5 grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Kapak</dt>
                <dd className="font-semibold text-slate-950">{pendingUpdate.gateName}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Eski aciklik</dt>
                <dd className="font-semibold text-slate-950">{pendingUpdate.oldPercent}%</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Yeni aciklik</dt>
                <dd className="font-semibold text-slate-950">{pendingUpdate.newPercent}%</dd>
              </div>
            </dl>

            {requiresSupervisorCode ? (
              <label className="mt-4 block">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <LockKeyhole className="h-4 w-4" />
                  Supervisor kodu
                </span>
                <input
                  type="password"
                  value={supervisorCode}
                  onChange={(event) => onSupervisorCodeChange(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950"
                />
              </label>
            ) : null}

            {supervisorError ? (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {supervisorError}
              </p>
            ) : null}

            {error ? (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancelGateUpdate}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Vazgec
              </button>
              <button
                type="button"
                onClick={onGateUpdate}
                disabled={isProcessing}
                className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isProcessing ? "Isleniyor..." : "Onayla"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
