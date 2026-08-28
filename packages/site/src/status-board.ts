import { GESELLSCHAFTEN, type Gesellschaft, type StatusRow } from "@tacto/csv";
import { escapeHtml, formatDatum } from "./format";

type Status = StatusRow["status"];

const STATUS_CLASS: Record<Status, string> = {
  Rot: "ampel ampel-rot",
  Gelb: "ampel ampel-gelb",
  Gruen: "ampel ampel-gruen",
};

// Module stehen fachlich für sich (Tacto-Funktionsbereiche) und werden vor
// den Rollout-Themen (z.B. Echtdatentransfer) einsortiert, wenn beide in den
// Daten vorkommen.
const MODUL_REIHENFOLGE = ["Analytics", "Automatisierung", "Agenten"];

function sortiereBereiche(bereiche: string[]): string[] {
  const module = MODUL_REIHENFOLGE.filter((m) => bereiche.includes(m));
  const themen = bereiche.filter((b) => !MODUL_REIHENFOLGE.includes(b));
  return [...module, ...themen];
}

function ampelCell(status: Status, title: string): string {
  return `<td><span class="${STATUS_CLASS[status]}" title="${escapeHtml(title)}"></span></td>`;
}

const EMPTY_CELL = `<td class="status-cell-empty">–</td>`;

/** Status-Matrix: Themen/Module als Zeilen, Gesellschaften als Spalten. */
export function renderStatusTable(container: HTMLElement, rows: StatusRow[], filter: Gesellschaft | "Alle"): void {
  container.innerHTML = "";
  if (rows.length === 0) return;

  const gesehen: string[] = [];
  for (const r of rows) if (!gesehen.includes(r.thema)) gesehen.push(r.thema);
  const bereiche = sortiereBereiche(gesehen);

  const gesellschaften: Gesellschaft[] = filter === "Alle" ? [...GESELLSCHAFTEN] : [filter];

  const headCells = ["<th>Thema</th>", ...gesellschaften.map((g) => `<th>${escapeHtml(g)}</th>`)];

  const bodyRows = bereiche.map((bereich) => {
    const rowsForBereich = rows.filter((r) => r.thema === bereich);
    const cells = gesellschaften.map((g) => {
      const entry = rowsForBereich.find((r) => r.gesellschaft === g);
      if (!entry) return EMPTY_CELL;
      const termin = entry.zieltermin ? ` (bis ${formatDatum(entry.zieltermin)})` : "";
      return ampelCell(entry.status, `${entry.status} – ${entry.verantwortlicher}: ${entry.naechsterSchritt}${termin}`);
    });
    return `<tr><th scope="row">${escapeHtml(bereich)}</th>${cells.join("")}</tr>`;
  });

  const table = document.createElement("table");
  table.className = "status-matrix";
  table.innerHTML = `<thead><tr>${headCells.join("")}</tr></thead><tbody>${bodyRows.join("")}</tbody>`;

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  wrap.appendChild(table);
  container.appendChild(wrap);
}
