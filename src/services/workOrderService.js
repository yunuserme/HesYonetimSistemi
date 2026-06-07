import { ApiError, apiRequest } from "./apiClient.js";

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

export async function getWorkOrders() {
  const workOrders = await apiRequest("/work-orders/", {
    auth: true,
  });

  if (!Array.isArray(workOrders)) {
    throw new ApiError("Work orders response format is invalid.", 0, workOrders);
  }

  return {
    items: workOrders.map(normalizeWorkOrder),
  };
}

async function updateStatus(workOrder, backendStatus) {
  const updatedWorkOrder = await apiRequest(`/work-orders/${workOrder.id}`, {
    method: "PATCH",
    auth: true,
    body: {
      status: backendStatus,
    },
  });

  return normalizeWorkOrder(updatedWorkOrder);
}

export async function acceptWorkOrder(workOrder) {
  return updateStatus(workOrder, "ACCEPTED");
}

export async function startWorkOrder(workOrder) {
  return updateStatus(workOrder, "IN_PROGRESS");
}

export async function completeWorkOrder(workOrder) {
  return updateStatus(workOrder, "COMPLETED");
}

export async function updateWorkOrderStatus(workOrder, status) {
  const backendStatus = backendStatusByUiStatus[status] ?? status;

  return updateStatus(workOrder, backendStatus);
}
