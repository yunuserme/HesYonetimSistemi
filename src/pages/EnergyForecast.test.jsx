import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";
import EnergyForecast from "./EnergyForecast.jsx";

const energyMock = vi.hoisted(() => {
  const forecastRows = [
    {
      date: "2026-05-28",
      day: "Thursday",
      turbine: "Turbine 1",
      predicted: 50.2,
      actual: 49.8,
      efficiency: 99.2,
      variance: "+0.8%",
      status: "NORMAL",
      chartLabel: "2026-05-28 - Turbine 1",
    },
    {
      date: "2026-05-29",
      day: "Friday",
      turbine: "Turbine 2",
      predicted: 48.7,
      actual: 47,
      efficiency: 96.5,
      variance: "+3.6%",
      status: "REVIEW",
      chartLabel: "2026-05-29 - Turbine 2",
    },
    {
      date: "2026-05-31",
      day: "Sunday",
      turbine: "Turbine 3",
      predicted: 50,
      actual: 47.3,
      efficiency: 94.6,
      variance: "+5.7%",
      status: "WARNING",
      chartLabel: "2026-05-31 - Turbine 3",
    },
    {
      date: "2026-06-01",
      day: "Monday",
      turbine: "Turbine 2",
      predicted: 46.8,
      actual: 45.9,
      efficiency: 98.1,
      variance: "+2.0%",
      status: "NORMAL",
      chartLabel: "2026-06-01 - Turbine 2",
    },
    {
      date: "2026-06-02",
      day: "Tuesday",
      turbine: "Turbine 2",
      predicted: 48.5,
      actual: 49.1,
      efficiency: 101.2,
      variance: "-1.2%",
      status: "NORMAL",
      chartLabel: "2026-06-02 - Turbine 2",
    },
  ];
  const calculateForecastSummary = (rows) => ({
    totalPredicted: rows.reduce((total, row) => total + row.predicted, 0),
    averageOutput: rows.length
      ? rows.reduce((total, row) => total + row.actual, 0) / rows.length
      : 0,
    peakProduction: rows.reduce(
      (peak, row) => Math.max(peak, row.predicted, row.actual),
      0,
    ),
  });
  const calculateForecastMetrics = () => ({
    forecastAccuracy: 95,
    errorRate: 5,
    averageDeviation: 1.2,
  });
  const getEnergyPredictions = vi.fn();
  const runManualPrediction = vi.fn();
  const manualPredictionResult = {
    timestamp: "2026-06-07T20:10:42.000Z",
    turbineId: 1,
    rpm: 1450,
    temperature: 67.5,
    waterLevel: 12.3,
    predictedPowerMw: 88.4,
    confidence: 50,
    isAnomaly: false,
    anomalyType: null,
  };

  return {
    calculateForecastMetrics,
    calculateForecastSummary,
    forecastRows,
    getEnergyPredictions,
    manualPredictionResult,
    runManualPrediction,
  };
});

vi.mock("../services/energyService.js", () => ({
  calculateForecastMetrics: energyMock.calculateForecastMetrics,
  calculateForecastSummary: energyMock.calculateForecastSummary,
  getEnergyPredictions: energyMock.getEnergyPredictions,
  runManualPrediction: energyMock.runManualPrediction,
}));

vi.mock("../services/exportService.js", () => ({
  exportForecastExcel: vi.fn(),
  exportForecastPdf: vi.fn(),
}));

describe("EnergyForecast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    energyMock.getEnergyPredictions.mockResolvedValue({
      summary: energyMock.calculateForecastSummary(energyMock.forecastRows),
      performance: energyMock.calculateForecastMetrics(energyMock.forecastRows),
      predictionChart: energyMock.forecastRows,
      weeklyTable: energyMock.forecastRows,
    });
    energyMock.runManualPrediction.mockResolvedValue(energyMock.manualPredictionResult);
  });

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

  it("calls manual prediction endpoint with valid input and renders the result", async () => {
    const user = userEvent.setup();
    render(<EnergyForecast />);

    await screen.findByRole("heading", { name: "Forecast Task Table" });
    await user.type(screen.getByLabelText("RPM"), "1450");
    await user.type(screen.getByLabelText("Temperature"), "67.5");
    await user.type(screen.getByLabelText("Water Level"), "12.3");
    await user.type(screen.getByLabelText(/turbine id/i), "1");
    await user.click(screen.getByRole("button", { name: "Run Prediction" }));

    expect(energyMock.runManualPrediction).toHaveBeenCalledWith({
      rpm: 1450,
      temperature: 67.5,
      waterLevel: 12.3,
      turbineId: 1,
    });
    expect(await screen.findByText("Last Manual Prediction Result")).toBeInTheDocument();
    expect(screen.getByText("88.4 MW")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();
  });

  it("does not call manual prediction endpoint for empty or invalid input", async () => {
    const user = userEvent.setup();
    render(<EnergyForecast />);

    await screen.findByRole("heading", { name: "Forecast Task Table" });
    await user.click(screen.getByRole("button", { name: "Run Prediction" }));

    expect(screen.getByText("RPM is required.")).toBeInTheDocument();
    expect(energyMock.runManualPrediction).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("RPM"), { target: { value: "-1" } });
    await user.type(screen.getByLabelText("Temperature"), "67.5");
    await user.type(screen.getByLabelText("Water Level"), "12.3");
    await user.click(screen.getByRole("button", { name: "Run Prediction" }));

    expect(screen.getByText("RPM cannot be negative.")).toBeInTheDocument();
    expect(energyMock.runManualPrediction).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("RPM"));
    await user.type(screen.getByLabelText("RPM"), "1450");
    await user.type(screen.getByLabelText(/turbine id/i), "0");
    await user.click(screen.getByRole("button", { name: "Run Prediction" }));

    expect(screen.getByText("Turbine ID must be a positive integer.")).toBeInTheDocument();
    expect(energyMock.runManualPrediction).not.toHaveBeenCalled();
  });

  it("renders backend error from manual prediction endpoint", async () => {
    const user = userEvent.setup();

    energyMock.runManualPrediction.mockRejectedValueOnce(new Error("Prediction service failed."));
    render(<EnergyForecast />);

    await screen.findByRole("heading", { name: "Forecast Task Table" });
    await user.type(screen.getByLabelText("RPM"), "1450");
    await user.type(screen.getByLabelText("Temperature"), "67.5");
    await user.type(screen.getByLabelText("Water Level"), "12.3");
    await user.click(screen.getByRole("button", { name: "Run Prediction" }));

    expect(await screen.findByText("Prediction service failed.")).toBeInTheDocument();
  });
});
