import {
  managerFaultMetrics,
  managerProductionMetrics,
  managerSystemStatus,
  managerTurbineMetrics,
} from "../data/mockManagerData.js";

const waitForMockResponse = (payload) =>
  new Promise((resolve) => {
    window.setTimeout(() => resolve(payload), 180);
  });

export function getManagerDashboardData() {
  return waitForMockResponse({
    production: managerProductionMetrics,
    turbines: managerTurbineMetrics,
    faults: managerFaultMetrics,
    systemStatus: managerSystemStatus,
    source: "mock",
  });
}
