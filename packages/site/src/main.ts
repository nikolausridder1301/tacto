import { GESELLSCHAFTEN, parseKpiCsv, parseStatusCsv, type Gesellschaft, type KpiRow, type StatusRow } from "@tacto/csv";
import { initPasswordGate } from "./auth";
import { formatQuartal } from "./format";
import { renderKpiChart } from "./kpi-chart";
import { verfuegbareQuartale } from "./kpi-data";
import { renderKpiTable } from "./kpi-table";
import { gesellschaftLogo, SK_LOGO } from "./logos";
import { renderStatusTable } from "./status-board";
import "./style.css";

const ALLE = "Alle" as const;
type Filter = Gesellschaft | typeof ALLE;

async function fetchCsv(path: string): Promise<string | null> {
  const response = await fetch(path);
  if (!response.ok) return null;
  return response.text();
}

function populateFilter(select: HTMLSelectElement): void {
  const options: Filter[] = [ALLE, ...GESELLSCHAFTEN];
  for (const option of options) {
    const el = document.createElement("option");
    el.value = option;
    el.textContent = option === ALLE ? "Gruppenebene" : option;
    select.appendChild(el);
  }
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

  const filterSelect = document.getElementById("gesellschaft-filter") as HTMLSelectElement;
  populateFilter(filterSelect);

  const headerLogo = document.getElementById("header-logo") as HTMLImageElement;
  headerLogo.src = SK_LOGO;

  const companyLogo = document.getElementById("company-logo") as HTMLImageElement;

  const quartalSelect = document.getElementById("quartal-filter") as HTMLSelectElement;
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

  const render = () => {
    const filter = filterSelect.value as Filter;
    const gefilterteKpis = filter === ALLE ? kpiRows : kpiRows.filter((r) => r.gesellschaft === filter);
    renderKpiTable(kpiTable, gefilterteKpis, quartalSelect.value || null);
    renderKpiChart(kpiChartSelect, kpiChartCanvas, gefilterteKpis);
    renderStatusTable(statusTable, statusRows, filter);

    if (filter === ALLE) {
      companyLogo.hidden = true;
    } else {
      companyLogo.src = gesellschaftLogo(filter);
      companyLogo.alt = filter;
      companyLogo.hidden = false;
    }
  };

  filterSelect.addEventListener("change", render);
  quartalSelect.addEventListener("change", render);
  render();
}

init();
