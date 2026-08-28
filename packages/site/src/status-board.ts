import { GESELLSCHAFTEN, type Gesellschaft, type StatusRow } from "@tacto/csv";
import { escapeHtml, formatDatum } from "./format";

type Status = StatusRow["status"];

const STATUS_RANK: Record<Status, number> = { Gruen: 0, Gelb: 1, Rot: 2 };
const STATUS_CLASS: Record<Status, string> = {
  Rot: "ampel ampel-rot",
  Gelb: "ampel ampel-gelb",
  Gruen: "ampel ampel-gruen",
};

function worst(statuses: Status[]): Status | null {
  if (statuses.length === 0) return null;
  return statuses.reduce((a, b) => (STATUS_RANK[b] > STATUS_RANK[a] ? b : a));
}

function ampelCell(status: Status, title: string): string {
  return `<td><span class="${STATUS_CLASS[status]}" title="${escapeHtml(title)}"></span></td>`;
}

function buildRow(label: string, rowsForEntity: StatusRow[], bereiche: string[], isAggregate: boolean): string {
  const byBereich = new Map<string, StatusRow[]>();
  for (const r of rowsForEntity) {
    const list = byBereich.get(r.thema) ?? [];
    list.push(r);
    byBereich.set(r.thema, list);
  }

  const gesamt = worst(rowsForEntity.map((r) => r.status));

  const cells = bereiche
    .map((b) => {
      const entries = byBereich.get(b);
      if (!entries || entries.length === 0) return `<td class="status-cell-empty">–</td>`;
      const status = worst(entries.map((e) => e.status))!;
      const title = isAggregate
        ? entries.map((e) => `${e.gesellschaft}: ${e.status}`).join(" · ")
        : (() => {
            const e = entries[0];
            const termin = e.zieltermin ? ` (bis ${formatDatum(e.zieltermin)})` : "";
            return `${e.status} – ${e.verantwortlicher}: ${e.naechsterSchritt}${termin}`;
          })();
      return ampelCell(status, title);
    })
    .join("");

  const gesamtCell = gesamt
    ? ampelCell(gesamt, isAggregate ? "Schlechtester Status über alle Gesellschaften" : "Schlechtester Status über alle Bereiche")
    : `<td class="status-cell-empty">–</td>`;

  return `<tr${isAggregate ? ' class="status-matrix-aggregate"' : ""}><th scope="row">${escapeHtml(label)}</th>${gesamtCell}${cells}</tr>`;
}

// Module stehen fachlich für sich (Tacto-Funktionsbereiche) und werden vor
// den Rollout-Themen (z.B. Echtdatentransfer) einsortiert, wenn beide in den
// Daten vorkommen.
const MODUL_REIHENFOLGE = ["Analytics", "Automatisierung", "Agenten"];

function sortiereBereiche(bereiche: string[]): string[] {
  const module = MODUL_REIHENFOLGE.filter((m) => bereiche.includes(m));
  const themen = bereiche.filter((b) => !MODUL_REIHENFOLGE.includes(b));
  return [...module, ...themen];
}

export function renderStatusTable(container: HTMLElement, rows: StatusRow[], filter: Gesellschaft | "Alle"): void {
  container.innerHTML = "";
  if (rows.length === 0) return;

  // Spalten = alle vorkommenden Bereiche: Module zuerst, dann Themen in
  // erster Auftrittsreihenfolge.
  const gesehen: string[] = [];
  for (const r of rows) if (!gesehen.includes(r.thema)) gesehen.push(r.thema);
  const bereiche = sortiereBereiche(gesehen);

  const gesellschaften: Gesellschaft[] = filter === "Alle" ? [...GESELLSCHAFTEN] : [filter];

  const table = document.createElement("table");
  table.className = "status-matrix";

  const theadHtml = `<thead><tr><th>Gesellschaft</th><th>Gesamt</th>${bereiche
    .map((b) => `<th>${escapeHtml(b)}</th>`)
    .join("")}</tr></thead>`;

  const bodyRows: string[] = [];
  if (filter === "Alle") {
    bodyRows.push(buildRow("Gesamt (Gruppe)", rows, bereiche, true));
  }
  for (const g of gesellschaften) {
    bodyRows.push(
      buildRow(g, rows.filter((r) => r.gesellschaft === g), bereiche, false),
    );
  }

  table.innerHTML = `${theadHtml}<tbody>${bodyRows.join("")}</tbody>`;

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  wrap.appendChild(table);
  container.appendChild(wrap);
}
