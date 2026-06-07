import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import ManagerDashboard from "./ManagerDashboard.jsx";

vi.mock("../services/managerService.js", () => ({
  getManagerDashboardData: vi.fn(() =>
    Promise.resolve({
      production: [
        {
          id: "currentProduction",
          label: "Current Production",
          value: 120.4,
          unit: "MW",
          trend: "Live total power from SCADA",
          tone: "emerald",
        },
        {
          id: "weeklyProduction",
          label: "Weekly Production",
          value: "N/A",
          unit: "",
          trend: "Backend aggregate endpoint missing",
          tone: "sky",
        },
        {
          id: "monthlyProduction",
          label: "Monthly Production",
          value: "N/A",
          unit: "",
          trend: "Backend aggregate endpoint missing",
          tone: "violet",
        },
      ],
      turbines: [
        {
          id: "activeTurbines",
          label: "Active Turbines",
          value: 2,
          unit: "",
          trend: "2 turbines reported",
          tone: "emerald",
        },
        {
          id: "faultyTurbines",
          label: "Faulty Turbines",
          value: 1,
          unit: "",
          trend: "Warning, fault, error, or critical status",
          tone: "violet",
        },
      ],
      faults: [
        {
          id: "activeFaults",
          label: "Active Faults",
          value: 1,
          unit: "",
          trend: "Unresolved alarms from backend",
          tone: "amber",
        },
        {
          id: "averageResolutionTime",
          label: "Average Resolution Time",
          value: "N/A",
          unit: "",
          trend: "No completed work orders with closed_at",
          tone: "amber",
        },
      ],
      systemStatus: {
        label: "System Status",
        value: "Warning",
        unit: "",
        trend: "1 critical alarms, 1 faulty turbines",
        tone: "amber",
      },
    }),
  ),
}));

describe("ManagerDashboard", () => {
  it("renders production metric cards", async () => {
    render(<ManagerDashboard />);

    expect(await screen.findByTestId("manager-dashboard")).toBeInTheDocument();
    expect(screen.getByText("Current Production")).toBeInTheDocument();
    expect(screen.getByText("Weekly Production")).toBeInTheDocument();
    expect(screen.getByText("Monthly Production")).toBeInTheDocument();
    expect(screen.getByText("Live data")).toBeInTheDocument();
  });

  it("renders turbine and fault metric cards", async () => {
    render(<ManagerDashboard />);

    expect(await screen.findByTestId("manager-dashboard")).toBeInTheDocument();
    expect(screen.getByText("Active Turbines")).toBeInTheDocument();
    expect(screen.getByText("Faulty Turbines")).toBeInTheDocument();
    expect(screen.getByText("Active Faults")).toBeInTheDocument();
    expect(screen.getByText("Average Resolution Time")).toBeInTheDocument();
  });
});
