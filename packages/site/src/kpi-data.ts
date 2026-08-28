import type { KpiRow } from "@tacto/csv";
import { formatEur, formatNumber, formatPercent } from "./format";

export type NumericKey =
  | "einkaufsvolumenEur"
  | "einsparungQuartalEur"
  | "einsparquoteProzent"
  | "zeitersparnisStd"
  | "rfqsAbgeschlossen"
  | "aktiveLieferanten"
  | "datenqualitaetProzent"
  | "aktiveNutzer";

export type ForecastKey = `${NumericKey}Forecast`;
export type BudgetKey = `${NumericKey}Budget`;

/** Wie Werte über mehrere Gesellschaften hinweg kombiniert werden (Filter "Alle"). */
type CompanyAggregate = "sum" | "avg";

/**
 * Wie Werte über mehrere Quartale hinweg kombiniert werden (YTD):
 * "sum"    – Flussgröße, addiert sich über das Jahr (z.B. Einsparung).
 * "avg"    – Durchschnitt über die bisherigen Quartale (z.B. Einsparquote).
 * "latest" – Bestandsgröße, YTD = aktuellster Quartalswert (z.B. Aktive Nutzer).
 */
type YtdMode = "sum" | "avg" | "latest";

export interface KpiDef {
  key: NumericKey;
  forecastKey: ForecastKey;
  budgetKey: BudgetKey;
  label: string;
  companyAggregate: CompanyAggregate;
  ytdMode: YtdMode;
  format: (n: number) => string;
}

function def(
  key: NumericKey,
  label: string,
  companyAggregate: CompanyAggregate,
  ytdMode: YtdMode,
  format: (n: number) => string,
): KpiDef {
  return {
    key,
    forecastKey: `${key}Forecast` as ForecastKey,
    budgetKey: `${key}Budget` as BudgetKey,
    label,
    companyAggregate,
    ytdMode,
    format,
  };
}

export const KPI_DEFS: KpiDef[] = [
  def("einkaufsvolumenEur", "Einkaufsvolumen gesamt", "sum", "sum", formatEur),
  def("einsparungQuartalEur", "Einsparung (Quartal)", "sum", "sum", formatEur),
  def("einsparquoteProzent", "Einsparquote", "avg", "avg", formatPercent),
  def("zeitersparnisStd", "Zeitersparnis", "sum", "sum", (n) => `${formatNumber(n)} Std.`),
  def("rfqsAbgeschlossen", "RFQs abgeschlossen", "sum", "sum", formatNumber),
  def("aktiveLieferanten", "Aktive Lieferanten", "sum", "latest", formatNumber),
  def("datenqualitaetProzent", "Datenqualität", "avg", "latest", formatPercent),
  def("aktiveNutzer", "Aktive Nutzer", "sum", "latest", formatNumber),
];

function combine(nums: number[], mode: CompanyAggregate): number {
  const sum = nums.reduce((a, b) => a + b, 0);
  return mode === "sum" ? sum : sum / nums.length;
}

/** Jahr und Quartalsnummer aus "YYYY-Qn". */
function splitQuartal(quartal: string): { jahr: number; q: number } {
  const [jahr, q] = quartal.split("-Q");
  return { jahr: Number(jahr), q: Number(q) };
}

export interface QuartalWerte {
  quartal: string;
  values: Record<NumericKey, number>;
  forecast: Record<NumericKey, number | null>;
  budget: Record<NumericKey, number | null>;
}

/** Aggregiert Rohzeilen (ggf. mehrere Gesellschaften) je Quartal, über alle drei Wertreihen (Ist/Forecast/Budget). */
export function aggregateByQuartal(rows: KpiRow[]): QuartalWerte[] {
  const byQuartal = new Map<string, KpiRow[]>();
  for (const row of rows) {
    const list = byQuartal.get(row.quartal) ?? [];
    list.push(row);
    byQuartal.set(row.quartal, list);
  }

  return Array.from(byQuartal.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([quartal, quartalsRows]) => {
      const values = {} as Record<NumericKey, number>;
      const forecast = {} as Record<NumericKey, number | null>;
      const budget = {} as Record<NumericKey, number | null>;

      for (const d of KPI_DEFS) {
        values[d.key] = combine(
          quartalsRows.map((r) => r[d.key]),
          d.companyAggregate,
        );

        const fc = quartalsRows.map((r) => r[d.forecastKey]).filter((n): n is number => n !== null);
        forecast[d.key] = fc.length === 0 ? null : combine(fc, d.companyAggregate);

        const bu = quartalsRows.map((r) => r[d.budgetKey]).filter((n): n is number => n !== null);
        budget[d.key] = bu.length === 0 ? null : combine(bu, d.companyAggregate);
      }

      return { quartal, values, forecast, budget };
    });
}

export interface QuartalSnapshot {
  quartal: string;
  ist: Record<NumericKey, number>;
  forecast: Record<NumericKey, number | null>;
  istYtd: Record<NumericKey, number>;
  forecastYtd: Record<NumericKey, number | null>;
  budgetYtd: Record<NumericKey, number | null>;
}

function ytdCombine(nums: number[], mode: YtdMode): number {
  if (mode === "latest") return nums[nums.length - 1];
  if (mode === "sum") return nums.reduce((a, b) => a + b, 0);
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Baut die Quartals-/YTD-Ansicht für genau ein ausgewähltes Quartal:
 * Ist/Forecast dieses Quartals, plus Ist/Forecast/Budget-YTD (kumuliert über
 * alle Quartale desselben Jahres bis einschließlich des gewählten Quartals).
 */
export function buildQuartalSnapshot(alleQuartale: QuartalWerte[], zielQuartal: string): QuartalSnapshot | null {
  const ziel = alleQuartale.find((q) => q.quartal === zielQuartal);
  if (!ziel) return null;

  const { jahr, q: zielQ } = splitQuartal(zielQuartal);
  const ytdQuartale = alleQuartale.filter((qw) => {
    const { jahr: j, q } = splitQuartal(qw.quartal);
    return j === jahr && q <= zielQ;
  });

  const istYtd = {} as Record<NumericKey, number>;
  const forecastYtd = {} as Record<NumericKey, number | null>;
  const budgetYtd = {} as Record<NumericKey, number | null>;

  for (const d of KPI_DEFS) {
    istYtd[d.key] = ytdCombine(
      ytdQuartale.map((q) => q.values[d.key]),
      d.ytdMode,
    );

    const fc = ytdQuartale.map((q) => q.forecast[d.key]).filter((n): n is number => n !== null);
    forecastYtd[d.key] = fc.length === 0 ? null : ytdCombine(fc, d.ytdMode);

    const bu = ytdQuartale.map((q) => q.budget[d.key]).filter((n): n is number => n !== null);
    budgetYtd[d.key] = bu.length === 0 ? null : ytdCombine(bu, d.ytdMode);
  }

  return { quartal: zielQuartal, ist: ziel.values, forecast: ziel.forecast, istYtd, forecastYtd, budgetYtd };
}
