import { ApiError, apiRequest } from "./apiClient.js";
import { mockTechnicianWorkOrders } from "../data/mockTechnicianWorkOrders.js";

const statusLabels = {
  OPEN: "Pending",
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CLOSED: "Completed",
};

const backendStatusByUiStatus = {
  Pending: "PENDING",
  Accepted: "ACCEPTED",
  "In Progress": "IN_PROGRESS",
  Completed: "COMPLETED",
};

function normalizeStatus(workOrder) {
  if (workOrder.closed_at) {
    return "Completed";
  }

  const normalizedKey = String(workOrder.status ?? "OPEN")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();

  return statusLabels[normalizedKey] ?? workOrder.status ?? "Pending";
}

export function normalizeWorkOrder(workOrder) {
  return {
    ...workOrder,
    due_at: workOrder.due_at ?? null,
    uiStatus: normalizeStatus(workOrder),
  };
}

function getMockWorkOrders() {
  return mockTechnicianWorkOrders.map(normalizeWorkOrder);
}

export async function getWorkOrders() {
  try {
    const workOrders = await apiRequest("/work-orders/", {
      auth: true,
    });

    return {
      items: workOrders.map(normalizeWorkOrder),
      source: "api",
    };
  } catch (error) {
    if (error instanceof ApiError && error.status !== 0) {
      throw error;
    }

    return {
      items: getMockWorkOrders(),
      source: "mock",
    };
  }
}

function updateLocally(workOrder, status) {
  const backendStatus = backendStatusByUiStatus[status] ?? status;
  const isCompleted = backendStatus === "COMPLETED";

  return normalizeWorkOrder({
    ...workOrder,
    status: backendStatus,
    closed_at: isCompleted ? new Date().toISOString() : workOrder.closed_at,
  });
}

async function updateStatus(workOrder, backendStatus, fallbackStatus) {
  try {
    const updatedWorkOrder = await apiRequest(`/work-orders/${workOrder.id}`, {
      method: "PATCH",
      auth: true,
      body: {
        status: backendStatus,
      },
    });

    return normalizeWorkOrder(updatedWorkOrder);
  } catch (error) {
    if (error instanceof ApiError && error.status !== 0) {
      throw error;
    }

    return updateLocally(workOrder, fallbackStatus);
  }
}

export async function acceptWorkOrder(workOrder) {
  return updateStatus(workOrder, "ACCEPTED", "Accepted");
}

export async function startWorkOrder(workOrder) {
  return updateStatus(workOrder, "IN_PROGRESS", "In Progress");
}

export async function completeWorkOrder(workOrder) {
  return updateStatus(workOrder, "COMPLETED", "Completed");
}

export async function updateWorkOrderStatus(workOrder, status) {
  const backendStatus = backendStatusByUiStatus[status] ?? status;

  return updateStatus(workOrder, backendStatus, status);
}
