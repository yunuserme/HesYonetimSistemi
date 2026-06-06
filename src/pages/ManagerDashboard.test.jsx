import { render, screen } from "@testing-library/react";
import ManagerDashboard from "./ManagerDashboard.jsx";

describe("ManagerDashboard", () => {
  it("renders production metric cards", async () => {
    render(<ManagerDashboard />);

    expect(await screen.findByTestId("manager-dashboard")).toBeInTheDocument();
    expect(screen.getByText("Today's Production")).toBeInTheDocument();
    expect(screen.getByText("Weekly Production")).toBeInTheDocument();
    expect(screen.getByText("Monthly Production")).toBeInTheDocument();
  });

  it("renders turbine and fault metric cards", async () => {
    render(<ManagerDashboard />);

    expect(await screen.findByTestId("manager-dashboard")).toBeInTheDocument();
    expect(screen.getByText("Active Turbines")).toBeInTheDocument();
    expect(screen.getByText("Faulty Turbines")).toBeInTheDocument();
    expect(screen.getByText("Active Faults")).toBeInTheDocument();
  });
});
