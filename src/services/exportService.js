import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const reportTitle = "HES Y\u00f6netim Sistemi - Energy Forecast Report";

function formatReportDate(date = new Date()) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatFileDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getExportRows(rows) {
  return rows.map((row) => ({
    Date: row.date,
    Turbine: row.turbine,
    "Predicted MW": row.predicted,
    "Actual MW": row.actual,
    Efficiency: `${row.efficiency}%`,
    Variance: row.variance,
    Status: row.status,
  }));
}

export function exportForecastPdf({
  summary,
  performance,
  rows,
  range,
  statusFilter,
  turbineFilter,
}) {
  const doc = new jsPDF();
  const generatedAt = formatReportDate();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(reportTitle, 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Report Date: ${generatedAt}`, 14, 27);
  doc.text(`Range: ${range === "24h" ? "24 Hours" : "7 Days"}`, 14, 34);
  doc.text(`Status Filter: ${statusFilter}`, 14, 41);
  doc.text(`Turbine Filter: ${turbineFilter}`, 14, 48);

  autoTable(doc, {
    startY: 57,
    head: [["Metric", "Value"]],
    body: [
      ["Total Predicted", `${summary.totalPredicted} MW`],
      ["Average Output", `${summary.averageOutput} MW`],
      ["Peak Production", `${summary.peakProduction} MW`],
      ["Forecast Accuracy", `${performance.forecastAccuracy}%`],
      ["Error Rate", `${performance.errorRate}%`],
      ["Average Deviation", `${performance.averageDeviation} MW`],
    ],
    styles: {
      font: "helvetica",
      fontSize: 9,
    },
    headStyles: {
      fillColor: [15, 23, 42],
    },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [["Date", "Turbine", "Predicted MW", "Actual MW", "Efficiency", "Variance", "Status"]],
    body: rows.map((row) => [
      row.date,
      row.turbine,
      row.predicted,
      row.actual,
      `${row.efficiency}%`,
      row.variance,
      row.status,
    ]),
    styles: {
      font: "helvetica",
      fontSize: 9,
    },
    headStyles: {
      fillColor: [5, 150, 105],
    },
  });

  doc.save(`hes-energy-forecast-${formatFileDate()}.pdf`);
}

export function exportForecastExcel({ rows }) {
  const worksheet = XLSX.utils.json_to_sheet(getExportRows(rows));
  const workbook = XLSX.utils.book_new();

  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Forecast");
  XLSX.writeFile(workbook, `hes-energy-forecast-${formatFileDate()}.xlsx`);
}
