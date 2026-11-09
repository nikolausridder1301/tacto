import type { KpiRow } from "@tacto/csv";
import { formatEur, formatNumber, formatPercent } from "./format";

/** KPIs, die direkt als Spalte in kpis.csv stehen. */
export type BaseKey =
  | "bestellvolumenEur"
  | "einsparungenEur"
  | "verhandlungen"
  | "verhandlungsquoteProzent"
  | "datenqualitaetProzent"
  | "liefertreueProzent"
  | "mengentreueProzent";

/** Alle KPIs im Dashboard, inkl. der im Dashboard berechneten Quoten. */
export type NumericKey = BaseKey | "einsparquoteProzent";

type ForecastKey = `${BaseKey}Forecast`;
type BudgetKey = `${BaseKey}Budget`;

/** Wie Werte über mehrere Gesellschaften hinweg kombiniert werden (Filter "Alle"). */
type CompanyAggregate = "sum" | "avg";

/**
 * Wie Werte über mehrere Monate hinweg zu einem größeren Zeitraum kombiniert
 * werden (Monate -> Quartal, Monate -> Year-to-Date):
 * "sum"    – Flussgröße, addiert sich über den Zeitraum (z.B. Einsparungen).
 * "avg"    – Durchschnitt über die enthaltenen Monate (z.B. Liefertreue).
 * "latest" – Bestandsgröße, Wert des letzten enthaltenen Monats (z.B. Datenqualität).
 */
type PeriodMode = "sum" | "avg" | "latest";

/** KPI, die direkt aus einer CSV-Spalte gelesen wird. */
interface BaseKpiDef {
  kind: "base";
  key: BaseKey;
  forecastKey: ForecastKey;
  budgetKey: BudgetKey;
  label: string;
  companyAggregate: CompanyAggregate;
  periodMode: PeriodMode;
  format: (n: number) => string;
}

/**
 * Quote, die nicht in der CSV steht, sondern immer aus zwei anderen KPIs
 * berechnet wird (Zähler / Nenner in %) – auf jeder Ebene (Monat, Quartal,
 * YTD, Gesellschaft, Gruppe) aus den dort bereits summierten Werten. Dadurch
 * bleibt sie stets nachvollziehbar aus den angezeigten Zeilen und ist
 * automatisch nach Volumen gewichtet statt ein Mittel aus Einzelquoten.
 */
interface RatioKpiDef {
  kind: "ratio";
  key: Exclude<NumericKey, BaseKey>;
  numerator: BaseKey;
  denominator: BaseKey;
  label: string;
  format: (n: number) => string;
}

export type KpiDef = BaseKpiDef | RatioKpiDef;

function base(
  key: BaseKey,
  label: string,
  companyAggregate: CompanyAggregate,
  periodMode: PeriodMode,
  format: (n: number) => string,
): BaseKpiDef {
  return {
    kind: "base",
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
  base("bestellvolumenEur", "Bestellvolumen", "sum", "sum", formatEur),
  base("einsparungenEur", "Einsparungen", "sum", "sum", formatEur),
  {
    kind: "ratio",
    key: "einsparquoteProzent",
    numerator: "einsparungenEur",
    denominator: "bestellvolumenEur",
    label: "Einsparungen / Bestellvolumen",
    format: formatPercent,
  },
  base("verhandlungen", "Verhandlungen", "sum", "sum", formatNumber),
  base("verhandlungsquoteProzent", "Verhandlungsquote", "avg", "avg", formatPercent),
  base("datenqualitaetProzent", "Datenqualität", "avg", "latest", formatPercent),
  base("liefertreueProzent", "Liefertreue", "avg", "avg", formatPercent),
  base("mengentreueProzent", "Mengentreue", "avg", "avg", formatPercent),
];

const BASE_DEFS = KPI_DEFS.filter((d): d is BaseKpiDef => d.kind === "base");
const RATIO_DEFS = KPI_DEFS.filter((d): d is RatioKpiDef => d.kind === "ratio");

type Werte = Record<NumericKey, number | null>;

/** Kombiniert die vorhandenen Werte; null, wenn gar kein Wert vorliegt (z.B. kein Ist für künftige Monate). */
function combine(values: (number | null)[], mode: CompanyAggregate): number | null {
  const nums = values.filter((n): n is number => n !== null);
  if (nums.length === 0) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return mode === "sum" ? sum : sum / nums.length;
}

function periodCombine(values: (number | null)[], mode: PeriodMode): number | null {
  const nums = values.filter((n): n is number => n !== null);
  if (nums.length === 0) return null;
  if (mode === "latest") return nums[nums.length - 1];
  if (mode === "sum") return nums.reduce((a, b) => a + b, 0);
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Ergänzt die berechneten Quoten aus den bereits kombinierten Basiswerten. */
function addRatios(werte: Werte): Werte {
  for (const d of RATIO_DEFS) {
    const zaehler = werte[d.numerator];
    const nenner = werte[d.denominator];
    werte[d.key] = zaehler !== null && nenner !== null && nenner !== 0 ? (zaehler / nenner) * 100 : null;
  }
  return werte;
}

function splitMonat(monat: string): { jahr: number; monatNr: number } {
  const [jahr, m] = monat.split("-");
  return { jahr: Number(jahr), monatNr: Number(m) };
}

function splitQuartal(quartal: string): { jahr: number; q: number } {
  const [jahr, q] = quartal.split("-Q");
  return { jahr: Number(jahr), q: Number(q) };
}

/** z.B. "2027-09" -> "2027-Q3". */
export function monatZuQuartal(monat: string): string {
  const { jahr, monatNr } = splitMonat(monat);
  return `${jahr}-Q${Math.ceil(monatNr / 3)}`;
}

export interface MonatWerte {
  monat: string;
  values: Werte;
  forecast: Werte;
  budget: Werte;
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
      const values = {} as Werte;
      const forecast = {} as Werte;
      const budget = {} as Werte;

      for (const d of BASE_DEFS) {
        values[d.key] = combine(
          monatsRows.map((r) => r[d.key]),
          d.companyAggregate,
        );
        forecast[d.key] = combine(
          monatsRows.map((r) => r[d.forecastKey]),
          d.companyAggregate,
        );
        budget[d.key] = combine(
          monatsRows.map((r) => r[d.budgetKey]),
          d.companyAggregate,
        );
      }

      return { monat, values: addRatios(values), forecast: addRatios(forecast), budget: addRatios(budget) };
    });
}

/** Alle im Datensatz vorkommenden Quartale (aus den Monatsdaten abgeleitet), aufsteigend sortiert. */
export function verfuegbareQuartale(rows: KpiRow[]): string[] {
  const quartale = new Set(aggregateByMonat(rows).map((m) => monatZuQuartal(m.monat)));
  return Array.from(quartale).sort();
}

export interface QuartalSnapshot {
  quartal: string;
  ist: Werte;
  budget: Werte;
  istYtd: Werte;
  budgetYtd: Werte;
}

/** Kombiniert eine Wertreihe (Ist oder Budget) über mehrere Monate, inkl. der berechneten Quoten. */
function kombiniereMonate(monate: MonatWerte[], reihe: "values" | "budget"): Werte {
  const werte = {} as Werte;
  for (const d of BASE_DEFS) {
    werte[d.key] = periodCombine(
      monate.map((m) => m[reihe][d.key]),
      d.periodMode,
    );
  }
  return addRatios(werte);
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

  return {
    quartal: zielQuartal,
    ist: kombiniereMonate(quartalsMonate, "values"),
    budget: kombiniereMonate(quartalsMonate, "budget"),
    istYtd: kombiniereMonate(ytdMonate, "values"),
    budgetYtd: kombiniereMonate(ytdMonate, "budget"),
  };
}
