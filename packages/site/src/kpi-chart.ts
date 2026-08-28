import type { KpiRow } from "@tacto/csv";
import { Chart } from "chart.js/auto";
import { formatEur, formatEurMio, formatMonatKurz } from "./format";
import { aggregateByMonat, KPI_DEFS, type NumericKey } from "./kpi-data";

/** Anzahl der jüngsten Monate, die im Chart angezeigt werden. */
const ANZAHL_MONATE = 6;

let chart: Chart | null = null;
let selectedKey: NumericKey = KPI_DEFS[0].key;
let lastRows: KpiRow[] = [];

function draw(canvas: HTMLCanvasElement): void {
  const def = KPI_DEFS.find((d) => d.key === selectedKey) ?? KPI_DEFS[0];
  const monatsWerte = aggregateByMonat(lastRows).slice(-ANZAHL_MONATE);

  chart?.destroy();
  chart = null;
  if (monatsWerte.length === 0) return;

  const hasForecast = monatsWerte.some((m) => m.forecast[def.key] !== null);

  chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: monatsWerte.map((m) => formatMonatKurz(m.monat)),
      datasets: [
        {
          label: "Ist",
          data: monatsWerte.map((m) => m.values[def.key]),
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
                data: monatsWerte.map((m) => m.forecast[def.key]),
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
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: hasForecast,
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
            callback: (value) => (def.format === formatEur ? formatEurMio(Number(value)) : def.format(Number(value))),
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
