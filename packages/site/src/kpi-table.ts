import type { KpiRow } from "@tacto/csv";
import { KPI_DEFS, aggregateByQuartal, buildQuartalSnapshot } from "./kpi-data";

const EMPTY = `<td class="kpi-delta">–</td>`;

function deltaCell(ist: number, ref: number | null, format: (n: number) => string): string {
  if (ref === null) return EMPTY;
  return `<td class="kpi-delta">${format(ist - ref)}</td>`;
}

function valueCell(value: number | null, format: (n: number) => string): string {
  return `<td>${value === null ? "–" : format(value)}</td>`;
}

/** Zeigt für ein ausgewähltes Quartal Ist/Forecast/Budget je KPI, mit YTD-Summen und Deltas. */
export function renderKpiTable(container: HTMLElement, rows: KpiRow[], zielQuartal: string | null): void {
  container.innerHTML = "";
  if (rows.length === 0 || !zielQuartal) return;

  const alleQuartale = aggregateByQuartal(rows);
  const snapshot = buildQuartalSnapshot(alleQuartale, zielQuartal);
  if (!snapshot) return;

  const table = document.createElement("table");
  table.className = "kpi-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>KPI</th>
        <th>IST Quartal</th>
        <th>Forecast Quartal</th>
        <th class="kpi-delta">Delta Forecast</th>
        <th>IST YTD</th>
        <th>Forecast YTD</th>
        <th>Budget YTD</th>
        <th class="kpi-delta">Delta Forecast (YTD)</th>
        <th class="kpi-delta">Delta Budget (YTD)</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement("tbody");
  for (const def of KPI_DEFS) {
    const tr = document.createElement("tr");
    const istQ = snapshot.ist[def.key];
    const fcQ = snapshot.forecast[def.key];
    const istYtd = snapshot.istYtd[def.key];
    const fcYtd = snapshot.forecastYtd[def.key];
    const buYtd = snapshot.budgetYtd[def.key];

    tr.innerHTML =
      `<th scope="row">${def.label}</th>` +
      valueCell(istQ, def.format) +
      valueCell(fcQ, def.format) +
      deltaCell(istQ, fcQ, def.format) +
      valueCell(istYtd, def.format) +
      valueCell(fcYtd, def.format) +
      valueCell(buYtd, def.format) +
      deltaCell(istYtd, fcYtd, def.format) +
      deltaCell(istYtd, buYtd, def.format);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  wrap.appendChild(table);
  container.appendChild(wrap);
}

/** Alle im Datensatz vorkommenden Quartale, aufsteigend sortiert. */
export function verfuegbareQuartale(rows: KpiRow[]): string[] {
  return aggregateByQuartal(rows).map((q) => q.quartal);
}
