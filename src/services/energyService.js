import {
  dashboardMetrics,
  forecastRanges,
  powerOutputLast24Hours,
  weeklyEnergyProduction,
} from "../data/mockEnergyData.js";

const waitForMockResponse = (payload) =>
  new Promise((resolve) => {
    window.setTimeout(() => resolve(payload), 180);
  });

function roundTo(value, decimals = 1) {
  return Number(value.toFixed(decimals));
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

function getForecastStatus(predicted, actual) {
  if (!actual) {
    return "REVIEW";
  }

  const errorPercent = Math.abs(((predicted - actual) / actual) * 100);

  if (errorPercent <= 2) {
    return "NORMAL";
  }

  if (errorPercent <= 5) {
    return "REVIEW";
  }

  return "WARNING";
}

function buildForecastRows(rows) {
  return rows.map((row) => ({
    ...row,
    label: row.day,
    chartLabel: `${row.day} - ${row.turbine.replace("Turbine ", "T")}`,
    efficiency: row.efficiency ?? getEfficiency(row.predicted, row.actual),
    variance: row.variance ?? getVariance(row.predicted, row.actual),
    status: row.status ?? getForecastStatus(row.predicted, row.actual),
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

  const totalAbsoluteErrorPercent = rows.reduce((total, row) => {
    if (!row.actual) {
      return total;
    }

    return total + Math.abs(((row.predicted - row.actual) / row.actual) * 100);
  }, 0);

  const totalDeviation = rows.reduce(
    (total, row) => total + Math.abs(row.predicted - row.actual),
    0,
  );
  const errorRate = totalAbsoluteErrorPercent / rows.length;

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

export function getEngineerDashboardData() {
  return waitForMockResponse({
    metrics: dashboardMetrics,
    powerOutputLast24Hours,
    weeklyEnergyProduction,
  });
}

export function getEnergyForecastData(range = "7d") {
  const selectedRange = forecastRanges[range] ?? forecastRanges["7d"];
  const tableRows = buildForecastRows(selectedRange.rows);

  return waitForMockResponse({
    summary: calculateForecastSummary(tableRows),
    performance: calculateForecastMetrics(tableRows),
    predictionChart: tableRows,
    weeklyTable: tableRows,
  });
}
