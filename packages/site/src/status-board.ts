import { GESELLSCHAFTEN, type Gesellschaft, type StatusRow } from "@tacto/csv";
import { escapeHtml, formatDatum } from "./format";

type Status = StatusRow["status"];

const STATUS_RANK: Record<Status, number> = { Gruen: 0, Gelb: 1, Rot: 2 };
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

function worst(statuses: Status[]): Status | null {
  if (statuses.length === 0) return null;
  return statuses.reduce((a, b) => (STATUS_RANK[b] > STATUS_RANK[a] ? b : a));
}

function ampelCell(status: Status, title: string): string {
  return `<td><span class="${STATUS_CLASS[status]}" title="${escapeHtml(title)}"></span></td>`;
}

const EMPTY_CELL = `<td class="status-cell-empty">–</td>`;

/**
 * Status-Matrix: Themen/Module als Zeilen, Gesellschaften als Spalten (Issue-Feedback:
 * "Firmen auf x-Achse, Themen auf y-Achse"). Eine "Gesamt"-Spalte zeigt pro Thema den
 * schlechtesten Status über alle Gesellschaften (nur bei Filter "Alle" sinnvoll), eine
 * "Gesamt"-Zeile zeigt pro Gesellschaft den schlechtesten Status über alle Themen
 * (bleibt auch gefiltert relevant, da sie nur innerhalb einer Gesellschaft aggregiert).
 */
export function renderStatusTable(container: HTMLElement, rows: StatusRow[], filter: Gesellschaft | "Alle"): void {
  container.innerHTML = "";
  if (rows.length === 0) return;

  const gesehen: string[] = [];
  for (const r of rows) if (!gesehen.includes(r.thema)) gesehen.push(r.thema);
  const bereiche = sortiereBereiche(gesehen);

  const gesellschaften: Gesellschaft[] = filter === "Alle" ? [...GESELLSCHAFTEN] : [filter];
  const zeigeGesamtSpalte = filter === "Alle";

  const headCells = [
    "<th>Thema</th>",
    ...gesellschaften.map((g) => `<th>${escapeHtml(g)}</th>`),
    ...(zeigeGesamtSpalte ? ["<th>Gesamt</th>"] : []),
  ];

  const bodyRows: string[] = [];

  for (const bereich of bereiche) {
    const rowsForBereich = rows.filter((r) => r.thema === bereich);

    const cells = gesellschaften.map((g) => {
      const entry = rowsForBereich.find((r) => r.gesellschaft === g);
      if (!entry) return EMPTY_CELL;
      const termin = entry.zieltermin ? ` (bis ${formatDatum(entry.zieltermin)})` : "";
      return ampelCell(entry.status, `${entry.status} – ${entry.verantwortlicher}: ${entry.naechsterSchritt}${termin}`);
    });

    let gesamtCell = "";
    if (zeigeGesamtSpalte) {
      const status = worst(rowsForBereich.map((r) => r.status));
      gesamtCell = status
        ? ampelCell(status, rowsForBereich.map((r) => `${r.gesellschaft}: ${r.status}`).join(" · "))
        : EMPTY_CELL;
    }

    bodyRows.push(`<tr><th scope="row">${escapeHtml(bereich)}</th>${cells.join("")}${gesamtCell}</tr>`);
  }

  const gesamtZeileCells = gesellschaften.map((g) => {
    const status = worst(rows.filter((r) => r.gesellschaft === g).map((r) => r.status));
    return status ? ampelCell(status, "Schlechtester Status über alle Themen") : EMPTY_CELL;
  });
  const gesamtZeileGesamtCell = zeigeGesamtSpalte
    ? (() => {
        const status = worst(rows.map((r) => r.status));
        return status ? ampelCell(status, "Schlechtester Status insgesamt") : EMPTY_CELL;
      })()
    : "";
  bodyRows.push(
    `<tr class="status-matrix-aggregate"><th scope="row">Gesamt</th>${gesamtZeileCells.join("")}${gesamtZeileGesamtCell}</tr>`,
  );

  const table = document.createElement("table");
  table.className = "status-matrix";
  table.innerHTML = `<thead><tr>${headCells.join("")}</tr></thead><tbody>${bodyRows.join("")}</tbody>`;

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  wrap.appendChild(table);
  container.appendChild(wrap);
}
