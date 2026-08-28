import { GESELLSCHAFTEN, parseKpiCsv, parseStatusCsv, type Gesellschaft, type KpiRow, type StatusRow } from "@tacto/csv";
import { initPasswordGate } from "./auth";
import { formatDatum } from "./format";
import { renderKpiGrid } from "./kpi-grid";
import { renderStatusBoard } from "./status-board";
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
    el.textContent = option;
    select.appendChild(el);
  }
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

  const standEl = document.getElementById("stand")!;
  const emptyState = document.getElementById("empty-state")!;
  const content = document.getElementById("content")!;
  const kpiGrid = document.getElementById("kpi-grid")!;
  const statusBoard = document.getElementById("status-board")!;

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

  const letzteDaten = [...kpiRows.map((r) => r.monat)].sort().at(-1);
  standEl.textContent = letzteDaten ? `Stand: ${formatDatum(`${letzteDaten}-01`)}` : "";

  const render = () => {
    const filter = filterSelect.value as Filter;
    const gefilterteKpis = filter === ALLE ? kpiRows : kpiRows.filter((r) => r.gesellschaft === filter);
    const gefilterterStatus = filter === ALLE ? statusRows : statusRows.filter((r) => r.gesellschaft === filter);
    renderKpiGrid(kpiGrid, gefilterteKpis);
    renderStatusBoard(statusBoard, gefilterterStatus);
  };

  filterSelect.addEventListener("change", render);
  render();
}

init();
