import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import TechnicianWorkOrders from "./TechnicianWorkOrders.jsx";

const workOrders = [
  {
    id: 101,
    title: "Pending work order",
    description: "Needs acceptance.",
    priority: "HIGH",
    assigned_to: 4,
    created_at: "2026-05-20T06:45:00Z",
    due_at: "2026-05-21T14:00:00Z",
    closed_at: null,
    uiStatus: "Pending",
  },
  {
    id: 102,
    title: "Accepted work order",
    description: "Ready to start.",
    priority: "MEDIUM",
    assigned_to: 4,
    created_at: "2026-05-19T09:20:00Z",
    due_at: "2026-05-22T11:30:00Z",
    closed_at: null,
    uiStatus: "Accepted",
  },
  {
    id: 103,
    title: "In progress work order",
    description: "Currently active.",
    priority: "LOW",
    assigned_to: 4,
    created_at: "2026-05-18T12:10:00Z",
    due_at: null,
    closed_at: null,
    uiStatus: "In Progress",
  },
  {
    id: 104,
    title: "Completed work order",
    description: "Already done.",
    priority: "MEDIUM",
    assigned_to: 4,
    created_at: "2026-05-17T08:30:00Z",
    due_at: "2026-05-19T17:00:00Z",
    closed_at: "2026-05-19T10:45:00Z",
    uiStatus: "Completed",
  },
];

const serviceMock = vi.hoisted(() => ({
  acceptWorkOrder: vi.fn(),
  completeWorkOrder: vi.fn(),
  getWorkOrders: vi.fn(),
  startWorkOrder: vi.fn(),
}));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: {
      id: 4,
      role: "TECHNICIAN",
      username: "technician1",
    },
  }),
}));

vi.mock("../services/workOrderService.js", () => serviceMock);

describe("TechnicianWorkOrders", () => {
  beforeEach(() => {
    serviceMock.getWorkOrders.mockResolvedValue({
      items: workOrders,
      source: "mock",
    });
    serviceMock.acceptWorkOrder.mockImplementation((workOrder) =>
      Promise.resolve({ ...workOrder, uiStatus: "Accepted" }),
    );
    serviceMock.startWorkOrder.mockImplementation((workOrder) =>
      Promise.resolve({ ...workOrder, uiStatus: "In Progress" }),
    );
    serviceMock.completeWorkOrder.mockImplementation((workOrder) =>
      Promise.resolve({
        ...workOrder,
        closed_at: "2026-05-20T12:00:00Z",
        uiStatus: "Completed",
      }),
    );
  });

  it("renders the work orders screen with fallback data", async () => {
    render(<TechnicianWorkOrders />);

    expect(await screen.findByTestId("technician-work-orders")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My Work Orders" })).toBeInTheDocument();
    expect(screen.getByText("Offline mode")).toBeInTheDocument();
    expect(screen.getByText("Pending work order")).toBeInTheDocument();
  });

  it("renders the expected work order statuses", async () => {
    render(<TechnicianWorkOrders />);

    expect(await screen.findByText("Pending work order")).toBeInTheDocument();
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Accepted").length).toBeGreaterThan(0);
    expect(screen.getAllByText("In Progress").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
  });

  it("handles Accept, Start, and Complete actions without crashing", async () => {
    const user = userEvent.setup();
    render(<TechnicianWorkOrders />);

    await screen.findByText("Pending work order");

    await user.click(screen.getByRole("button", { name: /accept/i }));
    await user.click((await screen.findAllByRole("button", { name: /start/i }))[0]);
    await user.click((await screen.findAllByRole("button", { name: /complete/i }))[0]);

    expect(serviceMock.acceptWorkOrder).toHaveBeenCalledTimes(1);
    expect(serviceMock.startWorkOrder).toHaveBeenCalledTimes(1);
    expect(serviceMock.completeWorkOrder).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("technician-work-orders")).toBeInTheDocument();
  });
});
