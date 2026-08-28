import type { KpiRow } from "@tacto/csv";
import { Chart } from "chart.js/auto";
import { formatEur, formatMonat, formatNumber, formatPercent } from "./format";

type NumericKey = Exclude<keyof KpiRow, "monat" | "gesellschaft">;

interface KpiDef {
  key: NumericKey;
  label: string;
  aggregate: "sum" | "avg";
  format: (n: number) => string;
}

const KPI_DEFS: KpiDef[] = [
  { key: "einkaufsvolumenEur", label: "Einkaufsvolumen gesamt", aggregate: "sum", format: formatEur },
  { key: "einkaufsvolumenAktivBetreutEur", label: "Aktiv betreutes Volumen", aggregate: "sum", format: formatEur },
  { key: "einsparungMonatEur", label: "Einsparung (Monat)", aggregate: "sum", format: formatEur },
  { key: "einsparungKumulativEur", label: "Einsparung (kumulativ)", aggregate: "sum", format: formatEur },
  { key: "einsparquoteProzent", label: "Einsparquote", aggregate: "avg", format: formatPercent },
  { key: "zeitersparnisStd", label: "Zeitersparnis", aggregate: "sum", format: (n) => `${formatNumber(n)} Std.` },
  { key: "rfqsAbgeschlossen", label: "RFQs abgeschlossen", aggregate: "sum", format: formatNumber },
  { key: "aktiveLieferanten", label: "Aktive Lieferanten", aggregate: "sum", format: formatNumber },
  { key: "lieferantenkonzentrationTop20Prozent", label: "Lieferantenkonzentration Top-20", aggregate: "avg", format: formatPercent },
  { key: "datenqualitaetProzent", label: "Datenqualität", aggregate: "avg", format: formatPercent },
  { key: "aktiveNutzer", label: "Aktive Nutzer", aggregate: "sum", format: formatNumber },
];

interface MonatAggregat {
  monat: string;
  values: Record<NumericKey, number>;
}

function aggregateByMonat(rows: KpiRow[]): MonatAggregat[] {
  const byMonat = new Map<string, KpiRow[]>();
  for (const row of rows) {
    const list = byMonat.get(row.monat) ?? [];
    list.push(row);
    byMonat.set(row.monat, list);
  }

  return Array.from(byMonat.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monat, monatsRows]) => {
      const values = {} as Record<NumericKey, number>;
      for (const def of KPI_DEFS) {
        const nums = monatsRows.map((r) => r[def.key]);
        values[def.key] =
          def.aggregate === "sum"
            ? nums.reduce((a, b) => a + b, 0)
            : nums.reduce((a, b) => a + b, 0) / nums.length;
      }
      return { monat, values };
    });
}

const charts: Chart[] = [];

export function renderKpiGrid(container: HTMLElement, rows: KpiRow[]): void {
  charts.forEach((c) => c.destroy());
  charts.length = 0;
  container.innerHTML = "";

  if (rows.length === 0) {
    return;
  }

  const monatsWerte = aggregateByMonat(rows);
  const letzter = monatsWerte[monatsWerte.length - 1];

  for (const def of KPI_DEFS) {
    const tile = document.createElement("article");
    tile.className = "kpi-tile";

    const label = document.createElement("p");
    label.className = "kpi-label";
    label.textContent = def.label;

    const value = document.createElement("p");
    value.className = "kpi-value";
    value.textContent = def.format(letzter.values[def.key]);

    const canvasWrap = document.createElement("div");
    canvasWrap.className = "kpi-sparkline";
    const canvas = document.createElement("canvas");
    canvasWrap.appendChild(canvas);

    tile.append(label, value, canvasWrap);
    container.appendChild(tile);

    if (monatsWerte.length > 1) {
      const chart = new Chart(canvas, {
        type: "line",
        data: {
          labels: monatsWerte.map((m) => formatMonat(m.monat)),
          datasets: [
            {
              data: monatsWerte.map((m) => m.values[def.key]),
              borderColor: "#2563eb",
              backgroundColor: "rgba(37, 99, 235, 0.1)",
              fill: true,
              tension: 0.3,
              pointRadius: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: true } },
          scales: { x: { display: false }, y: { display: false } },
        },
      });
      charts.push(chart);
    }
  }
}
