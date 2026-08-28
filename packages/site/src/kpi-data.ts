import type { KpiRow } from "@tacto/csv";
import { formatEur, formatNumber, formatPercent } from "./format";

export type NumericKey =
  | "einkaufsvolumenEur"
  | "einsparungMonatEur"
  | "einsparungKumulativEur"
  | "einsparquoteProzent"
  | "zeitersparnisStd"
  | "rfqsAbgeschlossen"
  | "aktiveLieferanten"
  | "datenqualitaetProzent"
  | "aktiveNutzer";

/** Plan-Gegenstück eines KPI-Felds, z.B. "einkaufsvolumenEur" -> "einkaufsvolumenEurPlan". */
export type PlanKey = `${NumericKey}Plan`;

function planKeyOf(key: NumericKey): PlanKey {
  return `${key}Plan` as PlanKey;
}

export interface KpiDef {
  key: NumericKey;
  planKey: PlanKey;
  label: string;
  aggregate: "sum" | "avg";
  format: (n: number) => string;
}

function def(key: NumericKey, label: string, aggregate: "sum" | "avg", format: (n: number) => string): KpiDef {
  return { key, planKey: planKeyOf(key), label, aggregate, format };
}

export const KPI_DEFS: KpiDef[] = [
  def("einkaufsvolumenEur", "Einkaufsvolumen gesamt", "sum", formatEur),
  def("einsparungMonatEur", "Einsparung (Monat)", "sum", formatEur),
  def("einsparungKumulativEur", "Einsparung (kumulativ)", "sum", formatEur),
  def("einsparquoteProzent", "Einsparquote", "avg", formatPercent),
  def("zeitersparnisStd", "Zeitersparnis", "sum", (n) => `${formatNumber(n)} Std.`),
  def("rfqsAbgeschlossen", "RFQs abgeschlossen", "sum", formatNumber),
  def("aktiveLieferanten", "Aktive Lieferanten", "sum", formatNumber),
  def("datenqualitaetProzent", "Datenqualität", "avg", formatPercent),
  def("aktiveNutzer", "Aktive Nutzer", "sum", formatNumber),
];

export interface MonatAggregat {
  monat: string;
  values: Record<NumericKey, number>;
  /** null = für diesen Monat/diese Auswahl liegt kein Plan-Wert vor. */
  planValues: Record<NumericKey, number | null>;
}

function aggregate(nums: number[], mode: "sum" | "avg"): number {
  const sum = nums.reduce((a, b) => a + b, 0);
  return mode === "sum" ? sum : sum / nums.length;
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
      const planValues = {} as Record<NumericKey, number | null>;

      for (const d of KPI_DEFS) {
        values[d.key] = aggregate(
          monatsRows.map((r) => r[d.key]),
          d.aggregate,
        );

        const planNums = monatsRows.map((r) => r[d.planKey]).filter((n): n is number => n !== null);
        planValues[d.key] = planNums.length === 0 ? null : aggregate(planNums, d.aggregate);
      }

      return { monat, values, planValues };
    });
}
