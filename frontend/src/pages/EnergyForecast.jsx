import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  FileSpreadsheet,
  FileText,
  LineChart as LineChartIcon,
  Percent,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "../components/ChartCard.jsx";
import FilterToggle from "../components/FilterToggle.jsx";
import MetricCard from "../components/MetricCard.jsx";
import ForecastTable from "../components/forecast/ForecastTable.jsx";
import {
  calculateForecastMetrics,
  calculateForecastSummary,
  getEnergyPredictions,
  runManualPrediction,
} from "../services/energyService.js";
import { exportForecastExcel, exportForecastPdf } from "../services/exportService.js";

const summaryCards = [
  {
    id: "totalPredicted",
    label: "Total Predicted",
    unit: "MW",
    tone: "sky",
    icon: TrendingUp,
    trend: "Based on selected range",
  },
  {
    id: "averageOutput",
    label: "Average Output",
    unit: "MW",
    tone: "emerald",
    icon: BarChart3,
    trend: "Normalized forecast average",
  },
  {
    id: "peakProduction",
    label: "Peak Production",
    unit: "MW",
    tone: "amber",
    icon: LineChartIcon,
    trend: "Highest expected output",
  },
];

const performanceCards = [
  {
    id: "forecastAccuracy",
    label: "Forecast Accuracy",
    unit: "%",
    tone: "emerald",
    icon: Percent,
    trend: "Calculated from predicted vs actual",
  },
  {
    id: "errorRate",
    label: "Error Rate",
    unit: "%",
    tone: "amber",
    icon: TrendingDown,
    trend: "Mean absolute percentage error",
  },
  {
    id: "averageDeviation",
    label: "Average Deviation",
    unit: "MW",
    tone: "violet",
    icon: Activity,
    trend: "Average absolute MW difference",
  },
];

const statusOptions = ["All", "NORMAL", "REVIEW", "WARNING"];
const initialManualPredictionForm = {
  rpm: "",
  temperature: "",
  waterLevel: "",
  turbineId: "",
};

function parseRequiredPredictionNumber(label, value) {
  const trimmedValue = String(value).trim();

  if (!trimmedValue) {
    return { error: `${label} is required.` };
  }

  const numberValue = Number(trimmedValue);

  if (!Number.isFinite(numberValue)) {
    return { error: `${label} must be a valid number.` };
  }

  if (numberValue < 0) {
    return { error: `${label} cannot be negative.` };
  }

  return { value: numberValue };
}

function validateManualPredictionForm(form) {
  const rpm = parseRequiredPredictionNumber("RPM", form.rpm);

  if (rpm.error) {
    return { error: rpm.error };
  }

  const temperature = parseRequiredPredictionNumber("Temperature", form.temperature);

  if (temperature.error) {
    return { error: temperature.error };
  }

  const waterLevel = parseRequiredPredictionNumber("Water Level", form.waterLevel);

  if (waterLevel.error) {
    return { error: waterLevel.error };
  }

  const turbineIdValue = String(form.turbineId).trim();
  let turbineId = null;

  if (turbineIdValue) {
    const numericTurbineId = Number(turbineIdValue);

    if (!Number.isInteger(numericTurbineId) || numericTurbineId <= 0) {
      return { error: "Turbine ID must be a positive integer." };
    }

    turbineId = numericTurbineId;
  }

  return {
    values: {
      rpm: rpm.value,
      temperature: temperature.value,
      waterLevel: waterLevel.value,
      turbineId,
    },
  };
}

function formatPredictionTimestamp(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ManualPredictionInput({ id, label, value, onChange, placeholder }) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-xs font-semibold uppercase tracking-normal text-slate-400">
        {label}
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

function FilterButtonGroup({ label, options, value, onChange }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-slate-400">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = value === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-slate-950">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="mt-1 text-slate-600">
          {entry.name}: <span className="font-semibold">{entry.value} MW</span>
        </p>
      ))}
    </div>
  );
}

export default function EnergyForecast() {
  const [range, setRange] = useState("7d");
  const [statusFilter, setStatusFilter] = useState("All");
  const [turbineFilter, setTurbineFilter] = useState("All");
  const [forecastData, setForecastData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [exportError, setExportError] = useState("");
  const [manualPredictionForm, setManualPredictionForm] = useState(initialManualPredictionForm);
  const [manualPredictionResult, setManualPredictionResult] = useState(null);
  const [manualPredictionError, setManualPredictionError] = useState("");
  const [isManualPredictionSubmitting, setIsManualPredictionSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    setForecastData(null);
    setLoadError("");

    getEnergyPredictions(range)
      .then((data) => {
        if (isMounted) {
          setForecastData(data);
          setExportError("");
        }
      })
      .catch((error) => {
        console.error("Energy forecast data could not be loaded.", error);

        if (isMounted) {
          setLoadError(error.message || "Energy forecast data could not be loaded.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [range]);

  const filteredRows = useMemo(() => {
    if (!forecastData) {
      return [];
    }

    return forecastData.weeklyTable.filter((row) => {
      const matchesStatus = statusFilter === "All" || row.status === statusFilter;
      const matchesTurbine = turbineFilter === "All" || row.turbine === turbineFilter;

      return matchesStatus && matchesTurbine;
    });
  }, [forecastData, statusFilter, turbineFilter]);

  const turbineOptions = useMemo(() => {
    if (!forecastData) {
      return ["All"];
    }

    return [
      "All",
      ...Array.from(new Set(forecastData.weeklyTable.map((row) => row.turbine))),
    ];
  }, [forecastData]);

  const filteredSummary = useMemo(
    () => calculateForecastSummary(filteredRows),
    [filteredRows],
  );

  const filteredPerformance = useMemo(
    () => calculateForecastMetrics(filteredRows),
    [filteredRows],
  );

  function handleExportPdf() {
    setExportError("");

    try {
      exportForecastPdf({
        summary: filteredSummary,
        performance: filteredPerformance,
        rows: filteredRows,
        range,
        statusFilter,
        turbineFilter,
      });
    } catch {
      setExportError("PDF export could not be completed. Please try again.");
    }
  }

  function handleExportExcel() {
    setExportError("");

    try {
      exportForecastExcel({
        rows: filteredRows,
      });
    } catch {
      setExportError("Excel export could not be completed. Please try again.");
    }
  }

  function updateManualPredictionField(field, value) {
    setManualPredictionForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setManualPredictionError("");
  }

  async function handleManualPredictionSubmit(event) {
    event.preventDefault();

    const validation = validateManualPredictionForm(manualPredictionForm);

    if (validation.error) {
      setManualPredictionError(validation.error);
      return;
    }

    setIsManualPredictionSubmitting(true);
    setManualPredictionError("");

    try {
      const result = await runManualPrediction(validation.values);

      setManualPredictionResult(result);
    } catch (error) {
      setManualPredictionError(error.message || "Manual prediction could not be completed.");
    } finally {
      setIsManualPredictionSubmitting(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="energy-forecast">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">
            Forecast Planning
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
            Energy Forecast
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FilterToggle value={range} onChange={setRange} />
          {forecastData ? (
            <>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!filteredRows.length}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-soft transition hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                <FileText className="h-4 w-4" />
                Export PDF
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={!filteredRows.length}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
              </button>
            </>
          ) : null}
        </div>
      </header>

      {loadError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {loadError}
        </div>
      ) : !forecastData ? (
        <div className="grid min-h-[60vh] place-items-center rounded-lg border border-slate-200 bg-white">
          <p className="text-sm font-semibold text-slate-500">Loading forecast data...</p>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            {summaryCards.map((card) => (
              <MetricCard
                key={card.id}
                label={card.label}
                value={filteredSummary[card.id]}
                unit={card.unit}
                trend={card.trend}
                tone={card.tone}
                icon={card.icon}
              />
            ))}
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {performanceCards.map((card) => (
              <MetricCard
                key={card.id}
                label={card.label}
                value={filteredPerformance[card.id]}
                unit={card.unit}
                trend={card.trend}
                tone={card.tone}
                icon={card.icon}
              />
            ))}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Manual Prediction</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Run a single backend prediction from entered operating values.
                </p>
              </div>
              {manualPredictionResult ? (
                <span
                  className={`inline-flex w-fit rounded-lg px-3 py-2 text-sm font-semibold ${
                    manualPredictionResult.isAnomaly
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {manualPredictionResult.isAnomaly ? "Anomaly" : "Normal"}
                </span>
              ) : null}
            </div>

            <form
              className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
              onSubmit={handleManualPredictionSubmit}
            >
              <ManualPredictionInput
                id="manual-rpm"
                label="RPM"
                value={manualPredictionForm.rpm}
                onChange={(value) => updateManualPredictionField("rpm", value)}
                placeholder="1450"
              />
              <ManualPredictionInput
                id="manual-temperature"
                label="Temperature"
                value={manualPredictionForm.temperature}
                onChange={(value) => updateManualPredictionField("temperature", value)}
                placeholder="67.5"
              />
              <ManualPredictionInput
                id="manual-water-level"
                label="Water Level"
                value={manualPredictionForm.waterLevel}
                onChange={(value) => updateManualPredictionField("waterLevel", value)}
                placeholder="12.3"
              />
              <ManualPredictionInput
                id="manual-turbine-id"
                label="Turbine ID (optional)"
                value={manualPredictionForm.turbineId}
                onChange={(value) => updateManualPredictionField("turbineId", value)}
                placeholder="1"
              />
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isManualPredictionSubmitting}
                  className="inline-flex min-h-[42px] w-full items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 xl:w-auto"
                >
                  {isManualPredictionSubmitting ? "Running..." : "Run Prediction"}
                </button>
              </div>
            </form>

            {manualPredictionError ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {manualPredictionError}
              </div>
            ) : null}

            {manualPredictionResult ? (
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-950">
                  Last Manual Prediction Result
                </h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                      Predicted Power
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-950">
                      {manualPredictionResult.predictedPowerMw} MW
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                      Confidence
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-950">
                      {manualPredictionResult.confidence}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                      Anomaly Type
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-950">
                      {manualPredictionResult.anomalyType ?? "N/A"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                      Timestamp
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-950">
                      {formatPredictionTimestamp(manualPredictionResult.timestamp)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                      RPM
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-950">
                      {manualPredictionResult.rpm}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                      Temperature
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-950">
                      {manualPredictionResult.temperature}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                      Water Level
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-950">
                      {manualPredictionResult.waterLevel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-normal text-slate-400">
                      Turbine ID
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-950">
                      {manualPredictionResult.turbineId ?? "N/A"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </section>

          {exportError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {exportError}
            </div>
          ) : null}

          <ChartCard
            title="Prediction vs Actual"
            subtitle="Chart reflects the selected range, status, and turbine filters."
          >
            {filteredRows.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredRows} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="chartLabel" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ForecastTooltip />} />
                  <Legend />
                  <Bar dataKey="predicted" name="Predicted" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" fill="#059669" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
                <p className="text-sm font-semibold text-slate-500">
                  No chart data matches the selected filters.
                </p>
              </div>
            )}
          </ChartCard>

          <section className="grid gap-5 rounded-lg border border-slate-200 bg-white p-4 shadow-soft lg:grid-cols-2">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Forecast Status</h2>
              <p className="mt-1 text-sm text-slate-500">
                The table, chart, metrics, and export files use the selected filters.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
              <FilterButtonGroup
                label="Status"
                options={statusOptions}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <FilterButtonGroup
                label="Turbine"
                options={turbineOptions}
                value={turbineFilter}
                onChange={setTurbineFilter}
              />
            </div>
          </section>

          <ForecastTable rows={filteredRows} />
        </>
      )}
    </div>
  );
}
