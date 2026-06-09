export const SCADA_STATUS = {
  NORMAL: "normal",
  WARNING: "warning",
  CRITICAL: "critical",
  OFFLINE: "offline",
};

function toNumber(value) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
}

function isUnavailable(value) {
  return value === null || value === undefined || value === "";
}

export function getWaterLevelStatus(value) {
  const level = toNumber(value);

  if (level === null || level < 0) {
    return SCADA_STATUS.OFFLINE;
  }

  if (level >= 85) {
    return SCADA_STATUS.CRITICAL;
  }

  if (level >= 70) {
    return SCADA_STATUS.WARNING;
  }

  return SCADA_STATUS.NORMAL;
}

export function getTemperatureStatus(value) {
  const temperature = toNumber(value);

  if (temperature === null || temperature < 0) {
    return SCADA_STATUS.OFFLINE;
  }

  if (temperature >= 90) {
    return SCADA_STATUS.CRITICAL;
  }

  if (temperature >= 75) {
    return SCADA_STATUS.WARNING;
  }

  return SCADA_STATUS.NORMAL;
}

export function getRpmStatus(value) {
  const rpm = toNumber(value);

  if (rpm === null || rpm < 0) {
    return SCADA_STATUS.OFFLINE;
  }

  if (rpm >= 1800) {
    return SCADA_STATUS.CRITICAL;
  }

  if (rpm >= 1500) {
    return SCADA_STATUS.WARNING;
  }

  return SCADA_STATUS.NORMAL;
}

export function getPowerOutputStatus(value) {
  if (isUnavailable(value)) {
    return SCADA_STATUS.OFFLINE;
  }

  const powerOutput = toNumber(value);

  if (powerOutput === null || powerOutput < 0) {
    return SCADA_STATUS.OFFLINE;
  }

  if (powerOutput === 0) {
    return SCADA_STATUS.OFFLINE;
  }

  if (powerOutput < 1 || powerOutput > 35) {
    return SCADA_STATUS.CRITICAL;
  }

  if (powerOutput < 3 || powerOutput > 25) {
    return SCADA_STATUS.WARNING;
  }

  return SCADA_STATUS.NORMAL;
}

export function getWorstScadaStatus(statuses = []) {
  if (statuses.includes(SCADA_STATUS.CRITICAL)) {
    return SCADA_STATUS.CRITICAL;
  }

  if (statuses.includes(SCADA_STATUS.OFFLINE)) {
    return SCADA_STATUS.OFFLINE;
  }

  if (statuses.includes(SCADA_STATUS.WARNING)) {
    return SCADA_STATUS.WARNING;
  }

  return SCADA_STATUS.NORMAL;
}

export function getSensorStatus(sensor) {
  if (sensor.id === "water-level") {
    return getWaterLevelStatus(sensor.value);
  }

  if (sensor.id === "turbine-rpm") {
    return getRpmStatus(sensor.value);
  }

  if (sensor.id === "turbine-temperature") {
    return getTemperatureStatus(sensor.value);
  }

  if (sensor.id === "instant-production") {
    return getPowerOutputStatus(sensor.value);
  }

  if (sensor.id === "active-alarms") {
    return Number(sensor.value) > 0 ? SCADA_STATUS.WARNING : SCADA_STATUS.NORMAL;
  }

  return SCADA_STATUS.NORMAL;
}

export function getTurbineHealthStatus(turbine) {
  if (turbine.status === "STANDBY" || turbine.status === "STOPPED") {
    return SCADA_STATUS.OFFLINE;
  }

  return getWorstScadaStatus([
    getRpmStatus(turbine.rpm),
    getTemperatureStatus(turbine.temperature),
    getPowerOutputStatus(turbine.powerOutput),
  ]);
}
