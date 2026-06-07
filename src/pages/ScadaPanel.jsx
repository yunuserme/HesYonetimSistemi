import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import AlarmPanel from "../components/scada/AlarmPanel.jsx";
import GateControl from "../components/scada/GateControl.jsx";
import ScadaChartModal from "../components/scada/ScadaChartModal.jsx";
import ScadaStatusBar from "../components/scada/ScadaStatusBar.jsx";
import SensorCard from "../components/scada/SensorCard.jsx";
import TurbineCard from "../components/scada/TurbineCard.jsx";
import {
  getScadaHistory,
  getLiveScadaData,
  getSensorData,
  getTurbines,
  stopTurbine,
  updateGateOpening,
} from "../services/scadaService.js";
import {
  getSensorStatus,
  getTurbineHealthStatus,
  getWorstScadaStatus,
  SCADA_STATUS,
} from "../utils/scadaStatus.js";

const statusLabels = {
  [SCADA_STATUS.NORMAL]: "Normal",
  [SCADA_STATUS.WARNING]: "Warning",
  [SCADA_STATUS.CRITICAL]: "Critical",
  [SCADA_STATUS.OFFLINE]: "Offline",
};

const statusTones = {
  [SCADA_STATUS.NORMAL]: "emerald",
  [SCADA_STATUS.WARNING]: "amber",
  [SCADA_STATUS.CRITICAL]: "rose",
  [SCADA_STATUS.OFFLINE]: "slate",
};

const SCADA_POLLING_MS = 1000;
const EMPTY_SCADA_STATUS = {
  label: "Sistem Durumu",
  value: "Offline",
  tone: "slate",
  lastUpdated: "",
  activeAlarmCount: 0,
};

function getGateStatus(positionPercent) {
  if (positionPercent <= 0) {
    return "CLOSED";
  }

  if (positionPercent >= 100) {
    return "OPEN";
  }

  return "PARTIAL";
}

function getGateFlowRate(positionPercent) {
  return Math.round(positionPercent * 2.8);
}

function getCurrentScadaTime() {
  return new Date().toISOString().replace("T", " ").slice(0, 16);
}

function normalizeTurbine(turbine) {
  return {
    id: turbine.id,
    name: turbine.name ?? turbine.turbine_name ?? `Turbin ${turbine.id}`,
    status: turbine.status ?? "STOPPED",
    rpm: Number(turbine.rpm ?? 0),
    temperature: Number(turbine.temperature ?? 0),
    powerOutput: Number(turbine.powerOutput ?? turbine.power_output ?? 0),
    loadPercent: Number(turbine.loadPercent ?? turbine.load_percent ?? 0),
    lastUpdated: turbine.lastUpdated ?? turbine.last_updated ?? null,
  };
}

function normalizeSensorMetric(sensor) {
  const sensorType = String(sensor.sensor_type ?? sensor.id ?? "").toUpperCase();
  const idByType = {
    RPM: "turbine-rpm",
    TEMPERATURE: "turbine-temperature",
    WATER: "water-level",
    POWER: "instant-production",
  };

  return {
    id: sensor.id != null ? String(sensor.id) : idByType[sensorType] ?? sensorType,
    label: sensor.label ?? sensor.sensor_name ?? sensor.sensor_type ?? "SCADA Sensor",
    value: sensor.value ?? sensor.current_value ?? 0,
    unit: sensor.unit ?? (sensorType === "RPM" ? "rpm" : sensorType === "TEMPERATURE" ? "C" : sensorType === "POWER" ? "MW" : ""),
    status: sensor.status ?? "Normal",
    tone: sensor.tone ?? "sky",
    turbineId: sensor.turbineId ?? sensor.turbine_id ?? null,
    sensorType,
  };
}

function normalizeGate(gate) {
  const positionPercent = Number(gate.positionPercent ?? gate.opening_percentage ?? gate.position_percent ?? 0);

  return {
    id: gate.id,
    name: gate.name ?? gate.gate_name ?? `Savak Kapagi ${gate.id}`,
    positionPercent,
    status: gate.status ?? getGateStatus(positionPercent),
    flowRate: Number(gate.flowRate ?? gate.flow_rate ?? getGateFlowRate(positionPercent)),
  };
}

function normalizeAlarm(alarm) {
  return {
    id: alarm.id,
    turbine: alarm.turbine ?? alarm.turbine_name ?? alarm.turbine_id ?? "SCADA",
    severity: String(alarm.severity ?? "INFO").toUpperCase(),
    message: alarm.message ?? alarm.detail ?? "SCADA alarm kaydi.",
    time: alarm.time ?? alarm.created_at ?? "",
    status: alarm.status ?? (alarm.is_active ? "active" : "open"),
  };
}

function normalizeList(data, normalizer) {
  if (!Array.isArray(data)) {
    return null;
  }

  return data.map(normalizer);
}

function extractLiveSensors(liveData) {
  if (!Array.isArray(liveData.turbines)) {
    return null;
  }

  return liveData.turbines.flatMap((turbine) =>
    Array.isArray(turbine.sensors)
      ? turbine.sensors.map((sensor) =>
          normalizeSensorMetric({
            ...sensor,
            turbine_id: sensor.turbine_id ?? turbine.id,
          }),
        )
      : [],
  );
}

function normalizeHistoryData(data) {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((row, index) => {
    const sensorType = String(row.sensor_type ?? "").toUpperCase();
    const value = Number(row.current_value ?? 0);

    return {
      time: row.time ?? row.last_signal_time ?? `${index + 1}`,
      rpm: sensorType === "RPM" ? value : null,
      temperature: sensorType === "TEMPERATURE" ? value : null,
      waterLevel: sensorType === "WATER" ? value : null,
      powerMw: sensorType === "POWER" ? value : null,
      vibration: sensorType === "VIBRATION" ? value : null,
    };
  });
}

export default function ScadaPanel() {
  const gateOverridesRef = useRef({});
  const turbineOverridesRef = useRef({});
  const isLiveRequestInFlightRef = useRef(false);
  const historyRequestIdRef = useRef(0);
  const [sensorMetrics, setSensorMetrics] = useState([]);
  const [systemStatus, setSystemStatus] = useState(EMPTY_SCADA_STATUS);
  const [gates, setGates] = useState([]);
  const [turbines, setTurbines] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [isScadaLoading, setIsScadaLoading] = useState(true);
  const [scadaSource, setScadaSource] = useState("api");
  const [scadaLoadError, setScadaLoadError] = useState("");
  const [lastScadaRefreshAt, setLastScadaRefreshAt] = useState("");
  const [selectedGateId, setSelectedGateId] = useState("");
  const [targetPercent, setTargetPercent] = useState("");
  const [pendingGateUpdate, setPendingGateUpdate] = useState(null);
  const [gateError, setGateError] = useState("");
  const [gateSuccess, setGateSuccess] = useState("");
  const [isGateUpdating, setIsGateUpdating] = useState(false);
  const [supervisorCode, setSupervisorCode] = useState("");
  const [supervisorError, setSupervisorError] = useState("");
  const [pendingEmergencyStop, setPendingEmergencyStop] = useState(null);
  const [isTurbineStopping, setIsTurbineStopping] = useState(false);
  const [turbineError, setTurbineError] = useState("");
  const [turbineSuccess, setTurbineSuccess] = useState("");
  const [selectedHistoryTarget, setSelectedHistoryTarget] = useState(null);
  const [historyRange, setHistoryRange] = useState("10m");
  const [historyData, setHistoryData] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historySource, setHistorySource] = useState("api");
  useEffect(() => {
    let isMounted = true;

    function applyGateOverrides(nextGates) {
      return nextGates.map((gate) => ({
        ...gate,
        ...(gateOverridesRef.current[gate.id] ?? {}),
      }));
    }

    function applyTurbineOverrides(nextTurbines) {
      return nextTurbines.map((turbine) => ({
        ...turbine,
        ...(turbineOverridesRef.current[turbine.id] ?? {}),
      }));
    }

    function applyLiveData({
      liveResponse,
      sensorsResponse = null,
      turbinesResponse = null,
    }) {
      const liveData = liveResponse.data ?? {};
      const responses = [liveResponse, sensorsResponse, turbinesResponse].filter(Boolean);
      const firstError = responses.find((response) => response.error)?.error ?? "";
      const nextSensors = normalizeList(liveData.sensors, normalizeSensorMetric)
        ?? extractLiveSensors(liveData)
        ?? normalizeList(sensorsResponse?.data, normalizeSensorMetric);
      const nextTurbines = normalizeList(liveData.turbines, normalizeTurbine)
        ?? normalizeList(turbinesResponse?.data, normalizeTurbine);
      const nextGates = normalizeList(liveData.gates, normalizeGate);
      const nextAlarms = normalizeList(liveData.activeAlarms ?? liveData.active_alarms, normalizeAlarm);
      const nextRefreshAt = getCurrentScadaTime();

      if (Array.isArray(nextSensors)) {
        setSensorMetrics(nextSensors);
      }

      if (Array.isArray(nextTurbines)) {
        setTurbines(applyTurbineOverrides(nextTurbines));
      }

      if (Array.isArray(nextGates)) {
        setGates(applyGateOverrides(nextGates));
      }

      if (Array.isArray(nextAlarms)) {
        setAlarms(nextAlarms);
      }

      setSystemStatus({
        ...(liveData.systemStatus ?? EMPTY_SCADA_STATUS),
        lastUpdated: liveData.timestamp ?? liveData.systemStatus?.lastUpdated ?? nextRefreshAt,
      });
      setScadaSource("api");
      setScadaLoadError(firstError);
      setLastScadaRefreshAt(nextRefreshAt);
    }

    async function refreshLiveData({ includeAuxiliaryData = false } = {}) {
      if (isLiveRequestInFlightRef.current) {
        return;
      }

      isLiveRequestInFlightRef.current = true;

      try {
        const [liveResponse, turbinesResponse, sensorsResponse] = includeAuxiliaryData
          ? await Promise.all([
              getLiveScadaData(),
              getTurbines(),
              getSensorData(),
            ])
          : [await getLiveScadaData(), null, null];

        if (!isMounted) {
          return;
        }

        applyLiveData({
          liveResponse,
          sensorsResponse,
          turbinesResponse,
        });
      } catch (error) {
        console.error("SCADA live data could not be loaded.", error);

        if (isMounted) {
          setScadaSource("error");
          setScadaLoadError(error.message || "SCADA verisi yuklenemedi.");
          setLastScadaRefreshAt(getCurrentScadaTime());
        }
      } finally {
        isLiveRequestInFlightRef.current = false;

        if (isMounted) {
          setIsScadaLoading(false);
        }
      }
    }

    setIsScadaLoading(true);
    refreshLiveData({ includeAuxiliaryData: true });

    const pollingId = window.setInterval(() => {
      refreshLiveData();
    }, SCADA_POLLING_MS);

    return () => {
      isMounted = false;
      window.clearInterval(pollingId);
    };
  }, []);

  useEffect(() => {
    if (!selectedHistoryTarget) {
      return undefined;
    }

    let isMounted = true;
    const requestId = historyRequestIdRef.current + 1;
    historyRequestIdRef.current = requestId;

    async function loadHistoryData() {
      setIsHistoryLoading(true);
      setHistoryError("");

      try {
        const response = await getScadaHistory({
          turbineId: selectedHistoryTarget.turbineId,
          range: historyRange,
          sensorType: selectedHistoryTarget.sensorType,
        });

        if (!isMounted || historyRequestIdRef.current !== requestId) {
          return;
        }

        setHistoryData(normalizeHistoryData(response.data));
        setHistorySource(response.source);
        setHistoryError(response.error ?? "");
      } catch (error) {
        if (isMounted && historyRequestIdRef.current === requestId) {
          setHistoryData([]);
          setHistorySource("api");
          setHistoryError(error.message || "Gecmis veri yuklenemedi.");
        }
      } finally {
        if (isMounted && historyRequestIdRef.current === requestId) {
          setIsHistoryLoading(false);
        }
      }
    }

    loadHistoryData();

    return () => {
      isMounted = false;
    };
  }, [historyRange, selectedHistoryTarget]);

  const sensorsWithStatus = sensorMetrics.map((sensor) => {
    const statusLevel = getSensorStatus(sensor);

    return {
      ...sensor,
      statusLevel,
      status: statusLabels[statusLevel],
    };
  });

  const turbinesWithStatus = turbines.map((turbine) => ({
    ...turbine,
    statusLevel: turbine.status === "DURDURULDU"
      ? SCADA_STATUS.OFFLINE
      : getTurbineHealthStatus(turbine),
  }));

  const systemStatusLevel = getWorstScadaStatus([
    ...sensorsWithStatus.map((sensor) => sensor.statusLevel),
    ...turbinesWithStatus.map((turbine) => turbine.statusLevel),
  ]);
  const derivedSystemStatus = {
    ...systemStatus,
    value: statusLabels[systemStatusLevel],
    tone: statusTones[systemStatusLevel],
    activeAlarmCount: alarms.length,
  };
  const selectedGate = gates.find((gate) => gate.id === selectedGateId);

  function openSensorHistory(sensor) {
    setSelectedHistoryTarget({
      id: sensor.id,
      title: sensor.label,
      type: "sensor",
      turbineId: sensor.turbineId,
      sensorType: sensor.sensorType,
    });
    setHistoryRange("10m");
    setHistoryData([]);
    setHistoryError("");
    setHistorySource("api");
  }

  function openTurbineHistory(turbine) {
    setSelectedHistoryTarget({
      id: turbine.id,
      title: turbine.name,
      type: "turbine",
      turbineId: turbine.id,
      sensorType: null,
    });
    setHistoryRange("10m");
    setHistoryData([]);
    setHistoryError("");
    setHistorySource("api");
  }

  function closeHistoryModal() {
    historyRequestIdRef.current += 1;
    setSelectedHistoryTarget(null);
    setHistoryRange("10m");
    setHistoryData([]);
    setIsHistoryLoading(false);
    setHistoryError("");
    setHistorySource("api");
  }

  function handleGateSelect(gateId) {
    const gate = gates.find((currentGate) => currentGate.id === gateId);

    setSelectedGateId(gateId);
    setTargetPercent(gate ? String(gate.positionPercent) : "");
    setPendingGateUpdate(null);
    setGateError("");
    setGateSuccess("");
    setIsGateUpdating(false);
    setSupervisorCode("");
    setSupervisorError("");
  }

  function handleTargetPercentChange(value) {
    setTargetPercent(value);
    setGateError("");
    setGateSuccess("");
  }

  function validateGateTarget(nextPercentValue) {
    if (!selectedGate) {
      return { error: "Once bir savak kapagi secin." };
    }

    if (nextPercentValue === "") {
      return { error: "Aciklik yuzdesi bos birakilamaz." };
    }

    const nextPercent = Number(nextPercentValue);

    if (!Number.isFinite(nextPercent)) {
      return { error: "Aciklik yuzdesi sayisal olmalidir." };
    }

    if (nextPercent < 0 || nextPercent > 100) {
      return { error: "Aciklik yuzdesi 0 ile 100 arasinda olmalidir." };
    }

    return { nextPercent };
  }

  function prepareGateUpdate(nextPercentValue = targetPercent) {
    const validation = validateGateTarget(nextPercentValue);

    setSupervisorCode("");
    setSupervisorError("");

    if (validation.error) {
      setGateError(validation.error);
      setPendingGateUpdate(null);
      return;
    }

    setGateError("");
    setGateSuccess("");
    setPendingGateUpdate({
      gateId: selectedGate.id,
      gateName: selectedGate.name,
      oldPercent: selectedGate.positionPercent,
      newPercent: validation.nextPercent,
    });
  }

  function prepareGateClose() {
    if (!selectedGate) {
      setGateError("Once bir savak kapagi secin.");
      setPendingGateUpdate(null);
      return;
    }

    setTargetPercent("0");
    prepareGateUpdate("0");
  }

  function cancelGateUpdate() {
    setPendingGateUpdate(null);
    setSupervisorCode("");
    setSupervisorError("");
    setIsGateUpdating(false);
  }

  function handleSupervisorCodeChange(value) {
    setSupervisorCode(value);
    setSupervisorError("");
  }

  async function handleGateUpdate() {
    if (!pendingGateUpdate) {
      return;
    }

    if (isGateUpdating) {
      return;
    }

    if (pendingGateUpdate.newPercent > 80 && supervisorCode !== "1234") {
      setSupervisorError("Supervisor kodu hatali veya eksik.");
      return;
    }

    const requestedGateUpdate = pendingGateUpdate;

    setIsGateUpdating(true);
    setGateError("");

    try {
      const response = await updateGateOpening(
        requestedGateUpdate.gateId,
        requestedGateUpdate.newPercent,
        supervisorCode,
      );

      if (!response.data) {
        setGateError(response.error || "Kapak acikligi guncellenemedi.");
        return;
      }

      const updatedGate = normalizeGate({
        id: requestedGateUpdate.gateId,
        name: requestedGateUpdate.gateName,
        positionPercent: requestedGateUpdate.newPercent,
        status: getGateStatus(requestedGateUpdate.newPercent),
        flowRate: getGateFlowRate(requestedGateUpdate.newPercent),
        ...response.data,
      });
      const nextGateOverride = {
        positionPercent: updatedGate.positionPercent,
        status: updatedGate.status,
        flowRate: updatedGate.flowRate,
      };

      gateOverridesRef.current = {
        ...gateOverridesRef.current,
        [requestedGateUpdate.gateId]: nextGateOverride,
      };
      setGates((currentGates) =>
        currentGates.map((gate) =>
          gate.id === requestedGateUpdate.gateId
            ? {
                ...gate,
                ...nextGateOverride,
              }
            : gate,
        ),
      );
      setPendingGateUpdate(null);
      setTargetPercent("");
      setSupervisorCode("");
      setSupervisorError("");
      setGateError("");
      setGateSuccess(
        `${requestedGateUpdate.gateName} API uzerinden guncellendi.`,
      );
    } catch (error) {
      setGateError(error.message || "Kapak acikligi guncellenemedi.");
    } finally {
      setIsGateUpdating(false);
    }
  }

  function prepareEmergencyStop(turbineId) {
    const turbine = turbines.find((currentTurbine) => currentTurbine.id === turbineId);

    setTurbineSuccess("");

    if (!turbine) {
      setTurbineError("Turbin bulunamadi.");
      setPendingEmergencyStop(null);
      return;
    }

    if (turbine.status === "DURDURULDU" || turbine.status === "STOPPED") {
      setTurbineError("Bu turbin zaten durduruldu.");
      setPendingEmergencyStop(null);
      return;
    }

    setTurbineError("");
    setPendingEmergencyStop(turbine);
  }

  function cancelEmergencyStop() {
    setPendingEmergencyStop(null);
    setTurbineError("");
    setIsTurbineStopping(false);
  }

  async function confirmEmergencyStop() {
    if (!pendingEmergencyStop) {
      return;
    }

    if (isTurbineStopping) {
      return;
    }

    const updatedAt = getCurrentScadaTime();

    setIsTurbineStopping(true);
    setTurbineError("");
    setTurbineSuccess("");

    try {
      const response = await stopTurbine(pendingEmergencyStop.id);

      if (!response.data) {
        setTurbineError(response.error || "Turbin durdurulamadi.");
        return;
      }

      const stoppedTurbine = normalizeTurbine({
        ...pendingEmergencyStop,
        ...response.data,
        id: pendingEmergencyStop.id,
        name: pendingEmergencyStop.name,
        status: String(response.data.status ?? "DURDURULDU").toUpperCase(),
        rpm: 0,
        powerOutput: 0,
        loadPercent: 0,
        lastUpdated: response.data.lastUpdated ?? response.data.last_updated ?? updatedAt,
      });
      const stoppedTurbineOverride = {
        status: stoppedTurbine.status,
        rpm: 0,
        powerOutput: 0,
        loadPercent: 0,
        lastUpdated: stoppedTurbine.lastUpdated,
      };

      turbineOverridesRef.current = {
        ...turbineOverridesRef.current,
        [pendingEmergencyStop.id]: stoppedTurbineOverride,
      };
      setTurbines((currentTurbines) =>
        currentTurbines.map((turbine) =>
          turbine.id === pendingEmergencyStop.id
            ? {
                ...turbine,
                ...stoppedTurbineOverride,
              }
            : turbine,
        ),
      );
      setTurbineSuccess(
        `${pendingEmergencyStop.name} API uzerinden durduruldu.`,
      );
      setTurbineError("");
      setPendingEmergencyStop(null);
    } catch (error) {
      setTurbineError(error.message || "Turbin durdurulamadi.");
    } finally {
      setIsTurbineStopping(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="scada-panel">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">
            CURRENT MODULE: SCADA
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
            SCADA Panel
          </h1>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-500">
          Santral izleme, turbin durumu, savak kapaklari ve aktif alarmlar icin statik panel iskeleti.
        </p>
      </header>

      <ScadaStatusBar status={derivedSystemStatus} />

      <div
        className={`inline-flex max-w-full flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
          scadaSource === "api"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        {isScadaLoading
          ? "SCADA verisi yukleniyor..."
          : scadaSource === "api"
            ? "API baglantisi aktif"
            : "Backend SCADA verisi yuklenemedi."}
        {!isScadaLoading && scadaSource === "error" && scadaLoadError ? (
          <span className="font-medium opacity-80">{scadaLoadError}</span>
        ) : null}
        {!isScadaLoading ? (
          <span className="font-medium opacity-80">Son guncelleme: {lastScadaRefreshAt}</span>
        ) : null}
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Sensor Kartlari</h2>
          <p className="mt-1 text-sm text-slate-500">Temel SCADA metrikleri ve anlik durum ozeti.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sensorsWithStatus.map((sensor) => (
            <SensorCard
              key={sensor.id}
              sensor={sensor}
              onViewHistory={openSensorHistory}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Turbinler</h2>
            <p className="mt-1 text-sm text-slate-500">Uretim, devir ve sicaklik bilgileri.</p>
          </div>
          {turbineSuccess ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {turbineSuccess}
            </div>
          ) : null}
        </div>
        {turbineError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {turbineError}
          </div>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-3">
          {turbinesWithStatus.map((turbine) => (
            <TurbineCard
              key={turbine.id}
              turbine={turbine}
              onEmergencyStop={prepareEmergencyStop}
              onViewHistory={openTurbineHistory}
            />
          ))}
        </div>
      </section>

      <GateControl
        gates={gates}
        selectedGateId={selectedGateId}
        targetPercent={targetPercent}
        pendingUpdate={pendingGateUpdate}
        isProcessing={isGateUpdating}
        supervisorCode={supervisorCode}
        error={gateError}
        supervisorError={supervisorError}
        successMessage={gateSuccess}
        onCancelGateUpdate={cancelGateUpdate}
        onGateSelect={handleGateSelect}
        onGateUpdate={handleGateUpdate}
        onPrepareGateClose={prepareGateClose}
        onPrepareGateUpdate={() => prepareGateUpdate()}
        onSupervisorCodeChange={handleSupervisorCodeChange}
        onTargetPercentChange={handleTargetPercentChange}
      />

      <AlarmPanel alarms={alarms} />

      {pendingEmergencyStop ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-rose-950/50 px-4">
          <div className="w-full max-w-lg rounded-lg border border-rose-200 bg-white p-5 shadow-soft">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-rose-100 p-3 text-rose-700" aria-hidden="true">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-normal text-rose-700">
                  Kritik Islem
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">Acil Turbin Durdurma Onayi</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Bu islem secili turbini backend uzerinden durdurur.
                </p>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-rose-700">Turbin</dt>
                <dd className="font-semibold text-slate-950">
                  {pendingEmergencyStop.name} / {pendingEmergencyStop.id}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-rose-700">Mevcut RPM</dt>
                <dd className="font-semibold text-slate-950">{pendingEmergencyStop.rpm}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-rose-700">Sicaklik</dt>
                <dd className="font-semibold text-slate-950">{pendingEmergencyStop.temperature} C</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-rose-700">MW Uretim</dt>
                <dd className="font-semibold text-slate-950">{pendingEmergencyStop.powerOutput} MW</dd>
              </div>
            </dl>

            {turbineError ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {turbineError}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelEmergencyStop}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Vazgec
              </button>
              <button
                type="button"
                onClick={confirmEmergencyStop}
                disabled={isTurbineStopping}
                className="inline-flex items-center justify-center rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isTurbineStopping ? "Isleniyor..." : "Onayla"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ScadaChartModal
        data={historyData}
        loading={isHistoryLoading}
        error={historyError}
        source={historySource}
        selectedRange={historyRange}
        selectedTarget={selectedHistoryTarget}
        onClose={closeHistoryModal}
        onRangeChange={setHistoryRange}
      />
    </div>
  );
}
