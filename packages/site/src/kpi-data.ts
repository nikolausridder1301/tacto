import type { KpiRow } from "@tacto/csv";
import { formatEur, formatNumber, formatPercent } from "./format";

export type NumericKey =
  | "einkaufsvolumenEur"
  | "einsparungMonatEur"
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
 * Wie Werte über mehrere Monate hinweg zu einem größeren Zeitraum kombiniert
 * werden (Monate -> Quartal, Monate -> Year-to-Date):
 * "sum"    – Flussgröße, addiert sich über den Zeitraum (z.B. Einsparung).
 * "avg"    – Durchschnitt über die enthaltenen Monate (z.B. Einsparquote).
 * "latest" – Bestandsgröße, Wert des letzten enthaltenen Monats (z.B. Aktive Nutzer).
 */
type PeriodMode = "sum" | "avg" | "latest";

export interface KpiDef {
  key: NumericKey;
  forecastKey: ForecastKey;
  budgetKey: BudgetKey;
  label: string;
  companyAggregate: CompanyAggregate;
  periodMode: PeriodMode;
  format: (n: number) => string;
}

function def(
  key: NumericKey,
  label: string,
  companyAggregate: CompanyAggregate,
  periodMode: PeriodMode,
  format: (n: number) => string,
): KpiDef {
  return {
    key,
    forecastKey: `${key}Forecast` as ForecastKey,
    budgetKey: `${key}Budget` as BudgetKey,
    label,
    companyAggregate,
    periodMode,
    format,
  };
}

export const KPI_DEFS: KpiDef[] = [
  def("einkaufsvolumenEur", "Einkaufsvolumen gesamt", "sum", "sum", formatEur),
  def("einsparungMonatEur", "Einsparung (Quartal)", "sum", "sum", formatEur),
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

function periodCombine(nums: number[], mode: PeriodMode): number {
  if (mode === "latest") return nums[nums.length - 1];
  if (mode === "sum") return nums.reduce((a, b) => a + b, 0);
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function splitMonat(monat: string): { jahr: number; monatNr: number } {
  const [jahr, m] = monat.split("-");
  return { jahr: Number(jahr), monatNr: Number(m) };
}

function splitQuartal(quartal: string): { jahr: number; q: number } {
  const [jahr, q] = quartal.split("-Q");
  return { jahr: Number(jahr), q: Number(q) };
}

/** z.B. "2026-09" -> "2026-Q3". */
export function monatZuQuartal(monat: string): string {
  const { jahr, monatNr } = splitMonat(monat);
  return `${jahr}-Q${Math.ceil(monatNr / 3)}`;
}

export interface MonatWerte {
  monat: string;
  values: Record<NumericKey, number>;
  forecast: Record<NumericKey, number | null>;
  budget: Record<NumericKey, number | null>;
}

/** Aggregiert Rohzeilen (ggf. mehrere Gesellschaften) je Monat, über alle drei Wertreihen (Ist/Forecast/Budget). */
export function aggregateByMonat(rows: KpiRow[]): MonatWerte[] {
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
      const forecast = {} as Record<NumericKey, number | null>;
      const budget = {} as Record<NumericKey, number | null>;

      for (const d of KPI_DEFS) {
        values[d.key] = combine(
          monatsRows.map((r) => r[d.key]),
          d.companyAggregate,
        );

        const fc = monatsRows.map((r) => r[d.forecastKey]).filter((n): n is number => n !== null);
        forecast[d.key] = fc.length === 0 ? null : combine(fc, d.companyAggregate);

        const bu = monatsRows.map((r) => r[d.budgetKey]).filter((n): n is number => n !== null);
        budget[d.key] = bu.length === 0 ? null : combine(bu, d.companyAggregate);
      }

      return { monat, values, forecast, budget };
    });
}

/** Alle im Datensatz vorkommenden Quartale (aus den Monatsdaten abgeleitet), aufsteigend sortiert. */
export function verfuegbareQuartale(rows: KpiRow[]): string[] {
  const quartale = new Set(aggregateByMonat(rows).map((m) => monatZuQuartal(m.monat)));
  return Array.from(quartale).sort();
}

export interface QuartalSnapshot {
  quartal: string;
  ist: Record<NumericKey, number>;
  budget: Record<NumericKey, number | null>;
  istYtd: Record<NumericKey, number>;
  budgetYtd: Record<NumericKey, number | null>;
}

/**
 * Baut die Quartals-/YTD-Ansicht für genau ein ausgewähltes Quartal, indem die
 * zugehörigen Monate zu einem konsolidierten Quartalswert kombiniert werden
 * (dieselbe Logik wie für Year-to-Date, nur über 3 statt N Monate). YTD =
 * kombiniert alle Monate desselben Jahres bis einschließlich des gewählten
 * Quartals.
 */
export function buildQuartalSnapshot(rows: KpiRow[], zielQuartal: string): QuartalSnapshot | null {
  const alleMonate = aggregateByMonat(rows);
  if (alleMonate.length === 0) return null;

  const { jahr: zielJahr, q: zielQ } = splitQuartal(zielQuartal);

  const quartalsMonate = alleMonate.filter((m) => monatZuQuartal(m.monat) === zielQuartal);
  if (quartalsMonate.length === 0) return null;

  const ytdMonate = alleMonate.filter((m) => {
    const { jahr, monatNr } = splitMonat(m.monat);
    return jahr === zielJahr && Math.ceil(monatNr / 3) <= zielQ;
  });

  const ist = {} as Record<NumericKey, number>;
  const budget = {} as Record<NumericKey, number | null>;
  const istYtd = {} as Record<NumericKey, number>;
  const budgetYtd = {} as Record<NumericKey, number | null>;

  for (const d of KPI_DEFS) {
    ist[d.key] = periodCombine(
      quartalsMonate.map((m) => m.values[d.key]),
      d.periodMode,
    );
    const buQ = quartalsMonate.map((m) => m.budget[d.key]).filter((n): n is number => n !== null);
    budget[d.key] = buQ.length === 0 ? null : periodCombine(buQ, d.periodMode);

    istYtd[d.key] = periodCombine(
      ytdMonate.map((m) => m.values[d.key]),
      d.periodMode,
    );
    const buY = ytdMonate.map((m) => m.budget[d.key]).filter((n): n is number => n !== null);
    budgetYtd[d.key] = buY.length === 0 ? null : periodCombine(buY, d.periodMode);
  }

  return { quartal: zielQuartal, ist, budget, istYtd, budgetYtd };
}
