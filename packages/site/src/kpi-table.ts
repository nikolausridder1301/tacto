import type { KpiRow } from "@tacto/csv";
import { formatMonatKurz } from "./format";
import { KPI_DEFS, aggregateByMonat } from "./kpi-data";

export function renderKpiTable(container: HTMLElement, rows: KpiRow[]): void {
  container.innerHTML = "";
  if (rows.length === 0) return;

  const monatsWerte = aggregateByMonat(rows);

  const table = document.createElement("table");
  table.className = "kpi-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.innerHTML = `<th>KPI</th>${monatsWerte.map((m) => `<th>${formatMonatKurz(m.monat)}</th>`).join("")}`;
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const def of KPI_DEFS) {
    const tr = document.createElement("tr");
    const cells = monatsWerte.map((m) => `<td>${def.format(m.values[def.key])}</td>`).join("");
    tr.innerHTML = `<th scope="row">${def.label}</th>${cells}`;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  wrap.appendChild(table);
  container.appendChild(wrap);
}
