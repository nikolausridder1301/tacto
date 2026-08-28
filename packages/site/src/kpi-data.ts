import type { KpiRow } from "@tacto/csv";
import { formatEur, formatNumber, formatPercent } from "./format";

export type NumericKey = Exclude<keyof KpiRow, "monat" | "gesellschaft">;

export interface KpiDef {
  key: NumericKey;
  label: string;
  aggregate: "sum" | "avg";
  format: (n: number) => string;
}

export const KPI_DEFS: KpiDef[] = [
  { key: "einkaufsvolumenEur", label: "Einkaufsvolumen gesamt", aggregate: "sum", format: formatEur },
  { key: "einkaufsvolumenAktivBetreutEur", label: "Aktiv betreutes Volumen", aggregate: "sum", format: formatEur },
  { key: "einsparungMonatEur", label: "Einsparung (Monat)", aggregate: "sum", format: formatEur },
  { key: "einsparungKumulativEur", label: "Einsparung (kumulativ)", aggregate: "sum", format: formatEur },
  { key: "einsparquoteProzent", label: "Einsparquote", aggregate: "avg", format: formatPercent },
  { key: "zeitersparnisStd", label: "Zeitersparnis", aggregate: "sum", format: (n) => `${formatNumber(n)} Std.` },
  { key: "rfqsAbgeschlossen", label: "RFQs abgeschlossen", aggregate: "sum", format: formatNumber },
  { key: "aktiveLieferanten", label: "Aktive Lieferanten", aggregate: "sum", format: formatNumber },
  {
    key: "lieferantenkonzentrationTop20Prozent",
    label: "Lieferantenkonzentration Top-20",
    aggregate: "avg",
    format: formatPercent,
  },
  { key: "datenqualitaetProzent", label: "Datenqualität", aggregate: "avg", format: formatPercent },
  { key: "aktiveNutzer", label: "Aktive Nutzer", aggregate: "sum", format: formatNumber },
];

export interface MonatAggregat {
  monat: string;
  values: Record<NumericKey, number>;
}

export function aggregateByMonat(rows: KpiRow[]): MonatAggregat[] {
  const byMonat = new Map<string, KpiRow[]>();
  for (const row of rows) {
    const list = byMonat.get(row.monat) ?? [];
    list.push(row);
    byMonat.set(row.monat, list);
  }

  return Array.from(byMonat.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monat, monatsRows]) => {
      const values = {} as Record<NumericKey, number>;
      for (const def of KPI_DEFS) {
        const nums = monatsRows.map((r) => r[def.key]);
        values[def.key] = def.aggregate === "sum" ? nums.reduce((a, b) => a + b, 0) : nums.reduce((a, b) => a + b, 0) / nums.length;
      }
      return { monat, values };
    });
}
