import type { KpiRow } from "@tacto/csv";
import { formatMonatKurz } from "./format";
import { aggregateByMonat, buildQuartalSnapshot, KPI_DEFS } from "./kpi-data";

const EMPTY = `<td class="kpi-delta">–</td>`;

function deltaCell(ist: number, ref: number | null, format: (n: number) => string): string {
  if (ref === null) return EMPTY;
  return `<td class="kpi-delta">${format(ist - ref)}</td>`;
}

function valueCell(value: number | null, format: (n: number) => string): string {
  return `<td>${value === null ? "–" : format(value)}</td>`;
}

/** Zeigt für ein ausgewähltes Quartal Ist/Budget je KPI, mit YTD-Summen und Deltas. */
export function renderKpiTable(container: HTMLElement, rows: KpiRow[], zielQuartal: string | null): void {
  container.innerHTML = "";
  if (rows.length === 0 || !zielQuartal) return;

  const snapshot = buildQuartalSnapshot(rows, zielQuartal);
  if (!snapshot) return;

  const table = document.createElement("table");
  table.className = "kpi-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>KPI</th>
        <th>Ist Quartal</th>
        <th>Budget Quartal</th>
        <th class="kpi-delta">Delta Quartal</th>
        <th>Ist Year to Date</th>
        <th>Budget Year to Date</th>
        <th class="kpi-delta">Delta Year to Date</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement("tbody");
  for (const def of KPI_DEFS) {
    const tr = document.createElement("tr");
    const istQ = snapshot.ist[def.key];
    const buQ = snapshot.budget[def.key];
    const istYtd = snapshot.istYtd[def.key];
    const buYtd = snapshot.budgetYtd[def.key];

    tr.innerHTML =
      `<th scope="row">${def.label}</th>` +
      valueCell(istQ, def.format) +
      valueCell(buQ, def.format) +
      deltaCell(istQ, buQ, def.format) +
      valueCell(istYtd, def.format) +
      valueCell(buYtd, def.format) +
      deltaCell(istYtd, buYtd, def.format);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  wrap.appendChild(table);
  container.appendChild(wrap);
}

/** Detailansicht: reine Ist-Werte je Monat (ohne Budget/Forecast), eine Spalte pro Monat. */
export function renderKpiMonatTable(container: HTMLElement, rows: KpiRow[]): void {
  container.innerHTML = "";
  if (rows.length === 0) return;

  const monatsWerte = aggregateByMonat(rows);
  if (monatsWerte.length === 0) return;

  const table = document.createElement("table");
  table.className = "kpi-table kpi-table--monat";

  const headerCells = monatsWerte.map((m) => `<th>${formatMonatKurz(m.monat)}</th>`).join("");
  table.innerHTML = `
    <thead>
      <tr>
        <th>KPI</th>
        ${headerCells}
      </tr>
    </thead>
  `;

  const tbody = document.createElement("tbody");
  for (const def of KPI_DEFS) {
    const tr = document.createElement("tr");
    const cells = monatsWerte.map((m) => valueCell(m.values[def.key], def.format)).join("");
    tr.innerHTML = `<th scope="row">${def.label}</th>${cells}`;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  wrap.appendChild(table);
  container.appendChild(wrap);
}
