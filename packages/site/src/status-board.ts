import type { StatusRow } from "@tacto/csv";
import { formatDatum } from "./format";

const STATUS_CLASS: Record<StatusRow["status"], string> = {
  Rot: "ampel ampel-rot",
  Gelb: "ampel ampel-gelb",
  Gruen: "ampel ampel-gruen",
};

export function renderStatusBoard(container: HTMLElement, rows: StatusRow[]): void {
  container.innerHTML = "";

  if (rows.length === 0) {
    return;
  }

  const byGesellschaft = new Map<string, StatusRow[]>();
  for (const row of rows) {
    const list = byGesellschaft.get(row.gesellschaft) ?? [];
    list.push(row);
    byGesellschaft.set(row.gesellschaft, list);
  }

  for (const [gesellschaft, themen] of byGesellschaft) {
    const group = document.createElement("section");
    group.className = "status-group";

    const heading = document.createElement("h3");
    heading.textContent = gesellschaft;
    group.appendChild(heading);

    const table = document.createElement("table");
    table.className = "status-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th></th>
          <th>Thema</th>
          <th>Verantwortlicher</th>
          <th>Nächster Schritt</th>
          <th>Priorität</th>
          <th>Zieltermin</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement("tbody");
    for (const row of themen) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="${STATUS_CLASS[row.status]}" title="${row.status}"></span></td>
        <td>${row.thema}</td>
        <td>${row.verantwortlicher}</td>
        <td>${row.naechsterSchritt}</td>
        <td>${row.prioritaet}</td>
        <td>${row.zieltermin ? formatDatum(row.zieltermin) : "–"}</td>
      `;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    const tableWrap = document.createElement("div");
    tableWrap.className = "status-table-wrap";
    tableWrap.appendChild(table);

    group.appendChild(tableWrap);
    container.appendChild(group);
  }
}
