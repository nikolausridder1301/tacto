import type { KpiRow } from "@tacto/csv";
import { Chart } from "chart.js/auto";
import { formatQuartalKurz } from "./format";
import { KPI_DEFS, aggregateByQuartal, type NumericKey } from "./kpi-data";

let chart: Chart | null = null;
let selectedKey: NumericKey = KPI_DEFS[0].key;
let lastRows: KpiRow[] = [];

function draw(canvas: HTMLCanvasElement): void {
  const def = KPI_DEFS.find((d) => d.key === selectedKey) ?? KPI_DEFS[0];
  const quartalsWerte = aggregateByQuartal(lastRows);

  chart?.destroy();
  chart = null;
  if (quartalsWerte.length === 0) return;

  const hasForecast = quartalsWerte.some((q) => q.forecast[def.key] !== null);
  const hasBudget = quartalsWerte.some((q) => q.budget[def.key] !== null);

  chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: quartalsWerte.map((q) => formatQuartalKurz(q.quartal)),
      datasets: [
        {
          label: "Ist",
          data: quartalsWerte.map((q) => q.values[def.key]),
          borderColor: "#2563c9",
          backgroundColor: "rgba(37, 99, 201, 0.1)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#2563c9",
        },
        ...(hasForecast
          ? [
              {
                label: "Forecast",
                data: quartalsWerte.map((q) => q.forecast[def.key]),
                borderColor: "#94a3b8",
                borderDash: [6, 4],
                backgroundColor: "transparent",
                fill: false,
                tension: 0.3,
                pointRadius: 2,
                pointBackgroundColor: "#94a3b8",
              },
            ]
          : []),
        ...(hasBudget
          ? [
              {
                label: "Budget",
                data: quartalsWerte.map((q) => q.budget[def.key]),
                borderColor: "#c9922c",
                borderDash: [2, 3],
                backgroundColor: "transparent",
                fill: false,
                tension: 0.3,
                pointRadius: 2,
                pointBackgroundColor: "#c9922c",
              },
            ]
          : []),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: hasForecast || hasBudget,
          position: "top",
          align: "end",
          labels: { boxWidth: 16, font: { family: "'JetBrains Mono', monospace", size: 11 }, color: "#5a6577" },
        },
        tooltip: {
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${def.format(ctx.parsed.y ?? 0)}` },
        },
      },
      scales: {
        x: {
          grid: { color: "#dce1ea" },
          ticks: { font: { family: "'JetBrains Mono', monospace", size: 11 }, color: "#5a6577" },
        },
        y: {
          grid: { color: "#dce1ea" },
          ticks: {
            callback: (value) => def.format(Number(value)),
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            color: "#5a6577",
          },
        },
      },
    },
  });
}

export function renderKpiChart(selectEl: HTMLSelectElement, canvas: HTMLCanvasElement, rows: KpiRow[]): void {
  lastRows = rows;

  if (selectEl.options.length === 0) {
    selectEl.innerHTML = KPI_DEFS.map((d) => `<option value="${d.key}">${d.label}</option>`).join("");
    selectEl.addEventListener("change", () => {
      selectedKey = selectEl.value as NumericKey;
      draw(canvas);
    });
  }
  selectEl.value = selectedKey;
  draw(canvas);
}
