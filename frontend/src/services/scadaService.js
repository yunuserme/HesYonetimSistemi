import { ApiError, apiRequest } from "./apiClient.js";

function createResponse(data) {
  return {
    data,
    source: "api",
    error: null,
  };
}

function isValidPercentage(value) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue >= 0 && numericValue <= 100;
}

function getLimitForRange(range = "10m") {
  const limitByRange = {
    "10m": 10,
    "1h": 60,
    last10Minutes: 10,
    lastHour: 60,
  };

  return limitByRange[range] ?? 10;
}

export async function getLiveScadaData() {
  const data = await apiRequest("/api/scada/live", {
    auth: true,
  });

  return createResponse(data);
}

export async function getScadaHistory({ turbineId, range = "10m", sensorType = null } = {}) {
  if (!turbineId) {
    throw new ApiError("SCADA history requires a turbine_id.", 400);
  }

  const params = new URLSearchParams({
    turbine_id: String(turbineId),
    limit: String(getLimitForRange(range)),
  });

  if (sensorType) {
    params.set("sensor_type", sensorType);
  }

  const data = await apiRequest(`/api/scada/history?${params.toString()}`, {
    auth: true,
  });

  return createResponse(data);
}

export async function getTurbines() {
  const data = await apiRequest("/api/turbines", {
    auth: true,
  });

  return createResponse(data);
}

export async function getGates() {
  const data = await apiRequest("/gates", {
    auth: true,
  });

  return createResponse(data);
}

export async function getSensorData(sensorId = null) {
  const path = sensorId
    ? `/api/sensor-data?sensor_id=${encodeURIComponent(sensorId)}`
    : "/sensors/";
  const data = await apiRequest(path, {
    auth: true,
  });

  return createResponse(data);
}

export async function updateGateOpening(gateId, openingPercentage) {
  if (!gateId) {
    throw new ApiError("Savak kapagi secimi zorunludur.", 400);
  }

  if (!isValidPercentage(openingPercentage)) {
    throw new ApiError("Kapak acikligi 0 ile 100 arasinda olmalidir.", 400);
  }

  const data = await apiRequest(`/gates/${encodeURIComponent(gateId)}`, {
    method: "PATCH",
    auth: true,
    body: {
      opening_percentage: Number(openingPercentage),
    },
  });

  return createResponse(data);
}

export async function stopTurbine(turbineId) {
  if (!turbineId) {
    throw new ApiError("Turbin secimi zorunludur.", 400);
  }

  const data = await apiRequest(`/turbines/${encodeURIComponent(turbineId)}`, {
    method: "PATCH",
    auth: true,
    body: {
      status: "STOPPED",
      rpm: 0,
      power_output: 0,
    },
  });

  return createResponse(data);
}
