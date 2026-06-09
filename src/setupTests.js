import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const RechartsContainer = ({ children }) =>
  React.createElement("div", { "data-testid": "recharts-container" }, children);

const RechartsElement = ({ children }) =>
  React.createElement("div", null, children);

vi.mock("recharts", () => ({
  Bar: RechartsElement,
  BarChart: RechartsContainer,
  CartesianGrid: RechartsElement,
  Legend: RechartsElement,
  Line: RechartsElement,
  LineChart: RechartsContainer,
  ResponsiveContainer: RechartsContainer,
  Tooltip: RechartsElement,
  XAxis: RechartsElement,
  YAxis: RechartsElement,
}));
