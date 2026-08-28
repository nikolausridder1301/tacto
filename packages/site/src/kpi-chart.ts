import type { KpiRow } from "@tacto/csv";
import { Chart } from "chart.js/auto";
import { formatMonatKurz } from "./format";
import { KPI_DEFS, aggregateByMonat, type NumericKey } from "./kpi-data";

let chart: Chart | null = null;
let selectedKey: NumericKey = KPI_DEFS[0].key;
let lastRows: KpiRow[] = [];

function draw(canvas: HTMLCanvasElement): void {
  const def = KPI_DEFS.find((d) => d.key === selectedKey) ?? KPI_DEFS[0];
  const monatsWerte = aggregateByMonat(lastRows);

  chart?.destroy();
  chart = null;
  if (monatsWerte.length === 0) return;

  chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: monatsWerte.map((m) => formatMonatKurz(m.monat)),
      datasets: [
        {
          label: def.label,
          data: monatsWerte.map((m) => m.values[def.key]),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#2563eb",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => def.format(ctx.parsed.y ?? 0) } },
      },
      scales: {
        y: {
          ticks: { callback: (value) => def.format(Number(value)) },
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
