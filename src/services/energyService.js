import { apiRequest } from "./apiClient.js";

function roundTo(value, decimals = 1) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Number(numericValue.toFixed(decimals));
}

function average(values) {
  const numericValues = values
    .map(Number)
    .filter((value) => Number.isFinite(value));

  if (!numericValues.length) {
    return 0;
  }

  return roundTo(
    numericValues.reduce((total, value) => total + value, 0) / numericValues.length,
    1,
  );
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().slice(0, 10);
}

function formatDay(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getVariance(predicted, actual) {
  if (!actual) {
    return "0.0%";
  }

  const variance = ((predicted - actual) / actual) * 100;

  return `${variance >= 0 ? "+" : ""}${roundTo(variance, 1)}%`;
}

function getEfficiency(predicted, actual) {
  if (!predicted) {
    return 0;
  }

  return roundTo((actual / predicted) * 100, 1);
}

function getForecastStatus(row) {
  if (row.is_anomaly) {
    return "WARNING";
  }

  if (Number(row.confidence ?? 1) < 0.7) {
    return "REVIEW";
  }

  return "NORMAL";
}

function normalizeForecastRow(row) {
  const predicted = roundTo(row.predicted_power_mw, 1);
  const actual = roundTo(row.current_power_output, 1);
  const date = formatDate(row.timestamp);
  const day = formatDay(row.timestamp);
  const turbine = row.turbine_name ?? `Turbine ${row.turbine_id}`;

  return {
    id: `${row.turbine_id}-${row.timestamp}`,
    date,
    day,
    label: day,
    chartLabel: `${date} - ${turbine}`,
    turbine,
    predicted,
    actual,
    efficiency: getEfficiency(predicted, actual),
    variance: getVariance(predicted, actual),
    status: getForecastStatus(row),
    backendStatus: row.status,
    confidence: roundTo(Number(row.confidence ?? 0) * 100, 1),
    isAnomaly: Boolean(row.is_anomaly),
    anomalyType: row.anomaly_type ?? null,
    rpm: roundTo(row.current_rpm, 1),
    temperature: roundTo(row.current_temperature, 1),
    timestamp: row.timestamp,
  };
}

function buildPowerHistoryRows(historyRows, liveTurbines = []) {
  const powerRows = historyRows
    .filter((row) => String(row.sensor_type ?? "").toUpperCase() === "POWER")
    .map((row) => ({
      time: formatTime(row.last_signal_time) || row.sensor_name,
      output: roundTo(row.current_value, 1),
    }));

  if (powerRows.length) {
    return powerRows;
  }

  return liveTurbines.map((turbine) => ({
    time: turbine.turbine_name ?? `Turbine ${turbine.id}`,
    output: roundTo(turbine.power_output, 1),
  }));
}

function buildProductionRows(forecastRows) {
  const productionByDate = forecastRows.reduce((accumulator, row) => {
    const existing = accumulator.get(row.date) ?? 0;

    accumulator.set(row.date, existing + row.actual);

    return accumulator;
  }, new Map());

  return Array.from(productionByDate.entries()).map(([day, energy]) => ({
    day,
    energy: roundTo(energy, 1),
  }));
}

export function calculateForecastMetrics(rows) {
  if (!rows.length) {
    return {
      forecastAccuracy: 0,
      errorRate: 0,
      averageDeviation: 0,
    };
  }

  const rowsWithActual = rows.filter((row) => Number(row.actual) !== 0);
  const totalAbsoluteErrorPercent = rowsWithActual.reduce(
    (total, row) => total + Math.abs(((row.predicted - row.actual) / row.actual) * 100),
    0,
  );
  const totalDeviation = rows.reduce(
    (total, row) => total + Math.abs(row.predicted - row.actual),
    0,
  );
  const errorRate = rowsWithActual.length
    ? totalAbsoluteErrorPercent / rowsWithActual.length
    : 0;

  return {
    forecastAccuracy: roundTo(Math.max(0, 100 - errorRate), 1),
    errorRate: roundTo(errorRate, 1),
    averageDeviation: roundTo(totalDeviation / rows.length, 2),
  };
}

export function calculateForecastSummary(rows) {
  if (!rows.length) {
    return {
      totalPredicted: 0,
      averageOutput: 0,
      peakProduction: 0,
    };
  }

  const totalPredicted = rows.reduce((total, row) => total + row.predicted, 0);
  const totalActual = rows.reduce((total, row) => total + row.actual, 0);
  const peakProduction = rows.reduce(
    (peak, row) => Math.max(peak, row.predicted, row.actual),
    0,
  );

  return {
    totalPredicted: roundTo(totalPredicted, 1),
    averageOutput: roundTo(totalActual / rows.length, 1),
    peakProduction: roundTo(peakProduction, 1),
  };
}

function buildForecastData(rows) {
  const tableRows = Array.isArray(rows)
    ? rows.map(normalizeForecastRow)
    : [];

  return {
    summary: calculateForecastSummary(tableRows),
    performance: calculateForecastMetrics(tableRows),
    predictionChart: tableRows,
    weeklyTable: tableRows,
  };
}

function normalizeManualPredictionResult(result) {
  return {
    timestamp: result.timestamp ?? "",
    turbineId: result.turbine_id ?? null,
    rpm: roundTo(result.rpm, 1),
    temperature: roundTo(result.temperature, 1),
    waterLevel: roundTo(result.water_level, 1),
    predictedPowerMw: roundTo(result.predicted_power_mw, 2),
    confidence: roundTo(Number(result.confidence ?? 0) * 100, 1),
    isAnomaly: Boolean(result.is_anomaly),
    anomalyType: result.anomaly_type ?? null,
  };
}

export async function getEngineerDashboardData() {
  const [liveData, historyRows, forecastRows] = await Promise.all([
    apiRequest("/api/scada/live", { auth: true }),
    apiRequest("/energy/history?limit=24", { auth: true }),
    apiRequest("/energy/forecast", { auth: true }),
  ]);
  const turbines = Array.isArray(liveData.turbines) ? liveData.turbines : [];
  const activeAlarms = Array.isArray(liveData.active_alarms) ? liveData.active_alarms : [];
  const normalizedForecastRows = Array.isArray(forecastRows)
    ? forecastRows.map(normalizeForecastRow)
    : [];
  const metrics = [
    {
      id: "total-power",
      label: "Total Power",
      value: roundTo(liveData.total_power_mw, 1),
      unit: "MW",
      trend: "From live SCADA data",
      tone: "sky",
    },
    {
      id: "active-turbines",
      label: "Active Turbines",
      value: Number(liveData.active_turbine_count ?? 0),
      unit: "",
      trend: `${turbines.length} turbines reported`,
      tone: "emerald",
    },
    {
      id: "average-temperature",
      label: "Average Temperature",
      value: average(turbines.map((turbine) => turbine.temperature)),
      unit: "C",
      trend: "Live turbine average",
      tone: "amber",
    },
    {
      id: "average-rpm",
      label: "Average RPM",
      value: average(turbines.map((turbine) => turbine.rpm)),
      unit: "rpm",
      trend: "Live turbine average",
      tone: "violet",
    },
    {
      id: "active-alarms",
      label: "Active Alarms",
      value: activeAlarms.length,
      unit: "",
      trend: "Unresolved SCADA alarms",
      tone: activeAlarms.length ? "amber" : "emerald",
    },
  ];

  return {
    metrics,
    powerOutputLast24Hours: buildPowerHistoryRows(
      Array.isArray(historyRows) ? historyRows : [],
      turbines,
    ),
    weeklyEnergyProduction: buildProductionRows(normalizedForecastRows),
  };
}

export async function getEnergyForecastData() {
  const forecastRows = await apiRequest("/energy/forecast", {
    auth: true,
  });

  return buildForecastData(forecastRows);
}

export async function getEnergyPredictions() {
  const predictionRows = await apiRequest("/energy/predictions", {
    auth: true,
  });

  return buildForecastData(predictionRows);
}

export async function runManualPrediction(input) {
  const body = {
    rpm: Number(input.rpm),
    temperature: Number(input.temperature),
    water_level: Number(input.waterLevel),
  };

  if (input.turbineId != null && input.turbineId !== "") {
    body.turbine_id = Number(input.turbineId);
  }

  const result = await apiRequest("/energy/predict", {
    method: "POST",
    auth: true,
    body,
  });

  return normalizeManualPredictionResult(result);
}
