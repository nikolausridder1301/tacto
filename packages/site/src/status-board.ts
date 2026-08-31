import { GESELLSCHAFTEN, type Gesellschaft, type StatusRow } from "@tacto/csv";
import { escapeHtml, formatDatum } from "./format";

type Status = StatusRow["status"];

const STATUS_LABEL: Record<Status, string> = {
  Rot: "Delayed",
  Gelb: "In Progress",
  Gruen: "Done",
  Blau: "2. Welle",
};

const STATUS_CLASS: Record<Status, string> = {
  Rot: "status-badge status-badge-rot",
  Gelb: "status-badge status-badge-gelb",
  Gruen: "status-badge status-badge-gruen",
  Blau: "status-badge status-badge-blau",
};

// Feste Reihenfolge der Themen (Rollout-Plan), unabhängig von der
// Reihenfolge, in der sie in status.csv vorkommen.
const MODUL_REIHENFOLGE = [
  "Datentransfer: lesen",
  "Datentransfer: schreiben",
  "Warengruppen",
  "Analytics",
  "Einsparungen (Hinweise)",
  "RFQs",
  "Agenten",
  "Lieferantenabfragen",
  "Lieferantenbewertungen",
  "Auftragsbestätigung",
];

function sortiereBereiche(bereiche: string[]): string[] {
  const module = MODUL_REIHENFOLGE.filter((m) => bereiche.includes(m));
  const themen = bereiche.filter((b) => !MODUL_REIHENFOLGE.includes(b));
  return [...module, ...themen];
}

function statusCell(status: Status, title: string): string {
  return `<td><span class="${STATUS_CLASS[status]}" title="${escapeHtml(title)}">${STATUS_LABEL[status]}</span></td>`;
}

const EMPTY_CELL = `<td class="status-cell-empty">–</td>`;

function tooltipText(entry: StatusRow): string {
  const termin = entry.zieltermin ? ` (bis ${formatDatum(entry.zieltermin)})` : "";
  const basis = `${entry.status} – ${entry.verantwortlicher}: ${entry.naechsterSchritt}${termin}`;
  return entry.kommentar ? `${basis}\nKommentar: ${entry.kommentar}` : basis;
}

/**
 * Status-Matrix: Themen/Module als Zeilen, Gesellschaften als Spalten. In der
 * Einzelansicht (eine konkrete Gesellschaft gefiltert) kommt zusätzlich eine
 * Spalte "Kommentare" dazu, die den Excel-Kommentar je Thema ausgeschrieben
 * zeigt (nicht nur im Hover wie in der Gruppenebene-Matrix).
 */
export function renderStatusTable(container: HTMLElement, rows: StatusRow[], filter: Gesellschaft | "Alle"): void {
  container.innerHTML = "";
  if (rows.length === 0) return;

  const gesehen: string[] = [];
  for (const r of rows) if (!gesehen.includes(r.thema)) gesehen.push(r.thema);
  const bereiche = sortiereBereiche(gesehen);

  const gesellschaften: Gesellschaft[] = filter === "Alle" ? [...GESELLSCHAFTEN] : [filter];
  const einzelansicht = filter !== "Alle";

  const headCells = [
    "<th>Thema</th>",
    ...gesellschaften.map((g) => `<th>${escapeHtml(g)}</th>`),
    ...(einzelansicht ? ["<th>Kommentare</th>"] : []),
  ];

  const bodyRows = bereiche.map((bereich) => {
    const rowsForBereich = rows.filter((r) => r.thema === bereich);
    const cells = gesellschaften.map((g) => {
      const entry = rowsForBereich.find((r) => r.gesellschaft === g);
      if (!entry) return EMPTY_CELL;
      return statusCell(entry.status, tooltipText(entry));
    });
    const kommentarCell = einzelansicht
      ? `<td class="status-comment-cell">${escapeHtml(rowsForBereich[0]?.kommentar ?? "")}</td>`
      : "";
    return `<tr><th scope="row">${escapeHtml(bereich)}</th>${cells.join("")}${kommentarCell}</tr>`;
  });

  const table = document.createElement("table");
  table.className = "status-matrix";
  table.innerHTML = `<thead><tr>${headCells.join("")}</tr></thead><tbody>${bodyRows.join("")}</tbody>`;

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  wrap.appendChild(table);
  container.appendChild(wrap);
}
