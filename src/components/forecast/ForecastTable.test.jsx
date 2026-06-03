import { render, screen, within } from "@testing-library/react";
import ForecastTable from "./ForecastTable.jsx";

const rows = [
  {
    date: "2026-06-03",
    day: "Wednesday",
    turbine: "Turbine 3",
    predicted: 45.4,
    actual: 44.7,
    efficiency: 98.5,
    variance: "+1.6%",
    status: "NORMAL",
  },
];

describe("ForecastTable", () => {
  it("renders the expected table columns", () => {
    render(<ForecastTable rows={rows} />);

    const table = screen.getByRole("table");

    expect(within(table).getByText("Date / Day")).toBeInTheDocument();
    expect(within(table).getByText("Turbine")).toBeInTheDocument();
    expect(within(table).getByText("Predicted MW")).toBeInTheDocument();
    expect(within(table).getByText("Actual MW")).toBeInTheDocument();
    expect(within(table).getByText("Efficiency")).toBeInTheDocument();
    expect(within(table).getByText("Variance")).toBeInTheDocument();
    expect(within(table).getByText("Status")).toBeInTheDocument();
  });

  it("renders row data correctly", () => {
    render(<ForecastTable rows={rows} />);

    const table = screen.getByRole("table");

    expect(within(table).getByText("2026-06-03")).toBeInTheDocument();
    expect(within(table).getByText("Wednesday")).toBeInTheDocument();
    expect(within(table).getByText("Turbine 3")).toBeInTheDocument();
    expect(within(table).getByText("45.4")).toBeInTheDocument();
    expect(within(table).getByText("44.7")).toBeInTheDocument();
    expect(within(table).getByText("98.5%")).toBeInTheDocument();
    expect(within(table).getByText("+1.6%")).toBeInTheDocument();
    expect(within(table).getByText("NORMAL")).toBeInTheDocument();
  });

  it("renders an empty state when there are no rows", () => {
    render(<ForecastTable rows={[]} />);

    expect(screen.getByText("No forecast rows match the selected filters.")).toBeInTheDocument();
  });
});
