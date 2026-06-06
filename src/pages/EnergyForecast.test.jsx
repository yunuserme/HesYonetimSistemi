import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import EnergyForecast from "./EnergyForecast.jsx";

vi.mock("../services/exportService.js", () => ({
  exportForecastExcel: vi.fn(),
  exportForecastPdf: vi.fn(),
}));

describe("EnergyForecast", () => {
  it("renders the forecast heading, table, and export buttons", async () => {
    render(<EnergyForecast />);

    expect(await screen.findByRole("heading", { name: "Energy Forecast" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Forecast Task Table" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /export pdf/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /export excel/i })).toBeInTheDocument();
  });

  it("filters rows by status", async () => {
    const user = userEvent.setup();
    render(<EnergyForecast />);

    await screen.findByRole("heading", { name: "Forecast Task Table" });
    await user.click(screen.getByRole("button", { name: "WARNING" }));

    const table = screen.getByRole("table");
    expect(within(table).getByText("2026-05-31")).toBeInTheDocument();
    expect(within(table).queryByText("2026-06-01")).not.toBeInTheDocument();
  });

  it("filters rows by turbine", async () => {
    const user = userEvent.setup();
    render(<EnergyForecast />);

    await screen.findByRole("heading", { name: "Forecast Task Table" });
    await user.click(screen.getByRole("button", { name: "Turbine 2" }));

    const table = screen.getByRole("table");
    expect(within(table).getAllByText("Turbine 2")).toHaveLength(3);
    expect(within(table).queryByText("Turbine 1")).not.toBeInTheDocument();
  });

  it("does not crash when filters return no table rows", async () => {
    const user = userEvent.setup();
    render(<EnergyForecast />);

    await screen.findByRole("heading", { name: "Forecast Task Table" });
    await user.click(screen.getByRole("button", { name: "WARNING" }));
    await user.click(screen.getByRole("button", { name: "Turbine 1" }));

    expect(screen.getByText("No forecast rows match the selected filters.")).toBeInTheDocument();
    expect(screen.getByText("No chart data matches the selected filters.")).toBeInTheDocument();
  });
});
