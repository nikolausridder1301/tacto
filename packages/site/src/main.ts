import { GESELLSCHAFTEN, parseKpiCsv, parseStatusCsv, type Gesellschaft, type KpiRow, type StatusRow } from "@tacto/csv";
import { initPasswordGate } from "./auth";
import { exportToExcel } from "./export";
import { formatQuartal } from "./format";
import { renderKpiChart, resizeKpiChart } from "./kpi-chart";
import { verfuegbareQuartale } from "./kpi-data";
import { renderKpiMonatTable, renderKpiTable } from "./kpi-table";
import { gesellschaftLogo, SK_LOGO } from "./logos";
import { createMenuButton } from "./menu-button";
import { createPillSelect } from "./pill-select";
import { renderStatusTable } from "./status-board";
import "./style.css";

const ALLE = "Alle" as const;
type Filter = Gesellschaft | typeof ALLE;

async function fetchCsv(path: string): Promise<string | null> {
  const response = await fetch(path);
  if (!response.ok) return null;
  return response.text();
}

function populateQuartalFilter(select: HTMLSelectElement, quartale: string[]): void {
  select.innerHTML = "";
  for (const q of quartale) {
    const el = document.createElement("option");
    el.value = q;
    el.textContent = formatQuartal(q);
    select.appendChild(el);
  }
  if (quartale.length > 0) select.value = quartale[quartale.length - 1];
}

async function init(): Promise<void> {
  const gate = document.getElementById("gate")!;
  const app = document.getElementById("app")!;
  const form = document.getElementById("gate-form") as HTMLFormElement;
  const input = document.getElementById("gate-password") as HTMLInputElement;
  const error = document.getElementById("gate-error")!;

  initPasswordGate({ gate, app, form, input, error });

  const headerLogo = document.getElementById("header-logo") as HTMLImageElement;

  const quartalSelect = document.getElementById("quartal-filter") as HTMLSelectElement;
  const monatDetailToggle = document.getElementById("monat-detail-toggle") as HTMLInputElement;
  const standEl = document.getElementById("stand")!;
  const emptyState = document.getElementById("empty-state")!;
  const content = document.getElementById("content")!;
  const kpiTable = document.getElementById("kpi-table")!;
  const kpiChartSelect = document.getElementById("kpi-chart-select") as HTMLSelectElement;
  const kpiChartCanvas = document.getElementById("kpi-chart") as HTMLCanvasElement;
  const statusTable = document.getElementById("status-table")!;

  const base = import.meta.env.BASE_URL;
  const [kpiCsv, statusCsv] = await Promise.all([fetchCsv(`${base}kpis.csv`), fetchCsv(`${base}status.csv`)]);

  let kpiRows: KpiRow[] = [];
  let statusRows: StatusRow[] = [];

  if (kpiCsv) {
    const result = parseKpiCsv(kpiCsv);
    if (result.errors.length > 0) console.error("kpis.csv Validierungsfehler:", result.errors);
    kpiRows = result.rows;
  }
  if (statusCsv) {
    const result = parseStatusCsv(statusCsv);
    if (result.errors.length > 0) console.error("status.csv Validierungsfehler:", result.errors);
    statusRows = result.rows;
  }

  if (kpiRows.length === 0 && statusRows.length === 0) {
    emptyState.hidden = false;
    content.style.display = "none";
    standEl.textContent = "";
    return;
  }

  const quartale = verfuegbareQuartale(kpiRows);
  populateQuartalFilter(quartalSelect, quartale);
  const letztesQuartal = quartale.at(-1);
  standEl.textContent = letztesQuartal ? `Stand: ${formatQuartal(letztesQuartal)}` : "";

  function render(): void {
    const filter = filterSelect.getValue() as Filter;
    const gefilterteKpis = filter === ALLE ? kpiRows : kpiRows.filter((r) => r.gesellschaft === filter);

    if (monatDetailToggle.checked) {
      quartalSelect.hidden = true;
      renderKpiMonatTable(kpiTable, gefilterteKpis);
    } else {
      quartalSelect.hidden = false;
      renderKpiTable(kpiTable, gefilterteKpis, quartalSelect.value || null);
    }

    renderKpiChart(kpiChartSelect, kpiChartCanvas, gefilterteKpis);
    renderStatusTable(statusTable, statusRows, filter);

    if (filter === ALLE) {
      headerLogo.src = SK_LOGO;
      headerLogo.alt = "Schmidt, Kranz & Co.";
    } else {
      headerLogo.src = gesellschaftLogo(filter);
      headerLogo.alt = filter;
    }
  }

  const filterOptions = [ALLE, ...GESELLSCHAFTEN].map((g) => ({ value: g, label: g === ALLE ? "Gruppenebene" : g }));
  const filterSelect = createPillSelect(document.getElementById("gesellschaft-filter")!, filterOptions, render);

  createMenuButton(document.getElementById("export-menu")!, "Export", [
    { label: "Als PDF exportieren", onSelect: () => window.print() },
    { label: "Als Excel exportieren", onSelect: () => void exportToExcel(kpiCsv, statusCsv) },
  ]);

  quartalSelect.addEventListener("change", render);
  monatDetailToggle.addEventListener("change", render);
  render();

  // Chart.js reagiert nicht zuverlässig auf den Layoutwechsel durch
  // @media print – ohne diesen Resize bleibt die Canvas auf der zuletzt am
  // Bildschirm gerenderten Größe und ragt im PDF-Export über den Rahmen hinaus.
  window.addEventListener("beforeprint", resizeKpiChart);
  window.addEventListener("afterprint", resizeKpiChart);
}

init();
