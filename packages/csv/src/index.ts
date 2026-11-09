// Datenmodell und Validierung für kpis.csv / status.csv.
// Wird sowohl vom Seiten-Build (packages/site) als auch vom Upload-Worker
// (packages/worker) verwendet, damit es nur eine Quelle der Wahrheit gibt.

import Papa from "papaparse";

export const GESELLSCHAFTEN = [
  "HAZEMAG & EPR",
  "HAZEMAG Systems",
  "Allmineral",
  "Maximator",
  "Maximator Hydrogen",
  "FEST",
  "Perforator",
] as const;

export type Gesellschaft = (typeof GESELLSCHAFTEN)[number];

const KPI_BASE_FIELDS = [
  "KPI_Bestellvolumen_EUR",
  "KPI_Einsparungen_EUR",
  "KPI_Verhandlungen",
  "KPI_Verhandlungsquote_Prozent",
  "KPI_Datenqualitaet_Prozent",
  "KPI_Liefertreue_Prozent",
  "KPI_Mengentreue_Prozent",
] as const;

type KpiBaseField = (typeof KPI_BASE_FIELDS)[number];

function forecastColumn(field: KpiBaseField): string {
  return `${field}_Forecast`;
}
function budgetColumn(field: KpiBaseField): string {
  return `${field}_Budget`;
}

// Ist-Werte sind (wie Forecast/Budget) nullable: Für künftige Monate liegen
// oft nur Budget-Werte (Jahresziele) vor, die Ist-Zellen bleiben dann leer.
// Die Quote "Einsparungen / Bestellvolumen" steht bewusst nicht in der CSV –
// das Dashboard berechnet sie immer aus diesen beiden Spalten.
export interface KpiRow {
  monat: string; // "YYYY-MM", z.B. "2027-03"
  gesellschaft: Gesellschaft;
  bestellvolumenEur: number | null;
  bestellvolumenEurForecast: number | null;
  bestellvolumenEurBudget: number | null;
  einsparungenEur: number | null;
  einsparungenEurForecast: number | null;
  einsparungenEurBudget: number | null;
  verhandlungen: number | null;
  verhandlungenForecast: number | null;
  verhandlungenBudget: number | null;
  verhandlungsquoteProzent: number | null;
  verhandlungsquoteProzentForecast: number | null;
  verhandlungsquoteProzentBudget: number | null;
  datenqualitaetProzent: number | null;
  datenqualitaetProzentForecast: number | null;
  datenqualitaetProzentBudget: number | null;
  liefertreueProzent: number | null;
  liefertreueProzentForecast: number | null;
  liefertreueProzentBudget: number | null;
  mengentreueProzent: number | null;
  mengentreueProzentForecast: number | null;
  mengentreueProzentBudget: number | null;
}

// Mapping CSV-Basisspalte -> KpiRow-Feldname (camelCase), damit die
// Parse-Schleife unten nicht für jede KPI denselben Code wiederholt.
const FIELD_MAP: Record<KpiBaseField, keyof KpiRow> = {
  KPI_Bestellvolumen_EUR: "bestellvolumenEur",
  KPI_Einsparungen_EUR: "einsparungenEur",
  KPI_Verhandlungen: "verhandlungen",
  KPI_Verhandlungsquote_Prozent: "verhandlungsquoteProzent",
  KPI_Datenqualitaet_Prozent: "datenqualitaetProzent",
  KPI_Liefertreue_Prozent: "liefertreueProzent",
  KPI_Mengentreue_Prozent: "mengentreueProzent",
};

export type Status = "Rot" | "Gelb" | "Gruen" | "Blau";
export type Prioritaet = "Hoch" | "Mittel" | "Niedrig";

export interface StatusRow {
  gesellschaft: Gesellschaft;
  thema: string;
  status: Status;
  verantwortlicher: string;
  naechsterSchritt: string;
  prioritaet: Prioritaet;
  zieltermin: string | null; // "YYYY-MM-DD" oder null
  kommentar: string | null; // optionale Spalte "Kommentar"
}

export interface ParseResult<T> {
  rows: T[];
  errors: string[];
}

const KPI_REQUIRED_COLUMNS = ["Monat", "Gesellschaft", ...KPI_BASE_FIELDS];
const STATUS_REQUIRED_COLUMNS = [
  "Gesellschaft",
  "Thema",
  "Status",
  "Verantwortlicher",
  "Naechster_Schritt",
  "Prioritaet",
  "Zieltermin",
];

const MONAT_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATUM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Wandelt einen Zahlen-Rohwert in eine Zahl um. Bei Semikolon-getrennten
 * Dateien (deutscher Excel-Export) wird "." als Tausendertrennzeichen
 * entfernt und "," als Dezimaltrennzeichen zu "." normalisiert.
 */
function parseLocaleNumber(raw: string, commaAsDecimal: boolean): number {
  const trimmed = raw.trim();
  if (trimmed === "") return NaN;
  const normalized = commaAsDecimal ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  return Number(normalized);
}

function parseCsv(csvText: string): { data: Record<string, string>[]; fields: string[]; commaAsDecimal: boolean; errors: string[] } {
  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    delimiter: "", // auto-detect "," oder ";"
  });

  const errors = result.errors.map((e) => `Zeile ${(e.row ?? 0) + 2}: ${e.message}`);
  const fields = result.meta.fields ?? [];
  const commaAsDecimal = result.meta.delimiter === ";";

  return { data: result.data, fields, commaAsDecimal, errors };
}

/**
 * Parst eine Wertspalte (Ist/Forecast/Budget) für eine Zeile. Fehlt die
 * Spalte komplett in der Datei, wird kein Wert erwartet (null) – für die
 * Ist-Spalten wird das vorher über KPI_REQUIRED_COLUMNS abgefangen. Ist sie
 * vorhanden, darf die einzelne Zelle trotzdem leer bleiben (null, kein
 * Validierungsfehler) – nur ein tatsächlich vorhandener, aber nicht-
 * numerischer Wert ist ein Fehler.
 */
function parseOptionalColumn(
  raw: Record<string, string>,
  fields: string[],
  column: string,
  commaAsDecimal: boolean,
  lineNo: number,
  errors: string[],
): { value: number | null; ok: boolean } {
  if (!fields.includes(column)) return { value: null, ok: true };
  const rawValue = (raw[column] ?? "").trim();
  if (rawValue === "") return { value: null, ok: true };
  const n = parseLocaleNumber(rawValue, commaAsDecimal);
  if (!Number.isFinite(n)) {
    errors.push(`Zeile ${lineNo}: Spalte "${column}" ist kein gültiger Zahlenwert ("${raw[column]}")`);
    return { value: null, ok: false };
  }
  return { value: n, ok: true };
}

export function parseKpiCsv(csvText: string): ParseResult<KpiRow> {
  const { data, fields, commaAsDecimal, errors } = parseCsv(csvText);

  const missing = KPI_REQUIRED_COLUMNS.filter((c) => !fields.includes(c));
  if (missing.length > 0) {
    return { rows: [], errors: [...errors, `Fehlende Spalte(n): ${missing.join(", ")}`] };
  }

  const rows: KpiRow[] = [];
  const seen = new Set<string>();

  data.forEach((raw, i) => {
    const lineNo = i + 2; // Zeile 1 = Header
    const monat = raw["Monat"]?.trim() ?? "";
    const gesellschaft = raw["Gesellschaft"]?.trim() ?? "";

    if (!MONAT_PATTERN.test(monat)) {
      errors.push(`Zeile ${lineNo}: ungültiger Monat "${monat}" (erwartet YYYY-MM)`);
      return;
    }
    if (!GESELLSCHAFTEN.includes(gesellschaft as Gesellschaft)) {
      errors.push(`Zeile ${lineNo}: unbekannte Gesellschaft "${gesellschaft}"`);
      return;
    }

    const key = `${monat}|${gesellschaft}`;
    if (seen.has(key)) {
      errors.push(`Zeile ${lineNo}: doppelte Kombination Monat+Gesellschaft (${monat}, ${gesellschaft})`);
      return;
    }

    const row: Partial<KpiRow> = { monat, gesellschaft: gesellschaft as Gesellschaft };
    let rowValid = true;

    for (const field of KPI_BASE_FIELDS) {
      const baseKey = FIELD_MAP[field];
      const ist = parseOptionalColumn(raw, fields, field, commaAsDecimal, lineNo, errors);
      if (!ist.ok) rowValid = false;
      (row as Record<string, unknown>)[baseKey] = ist.value;

      const forecast = parseOptionalColumn(raw, fields, forecastColumn(field), commaAsDecimal, lineNo, errors);
      if (!forecast.ok) rowValid = false;
      (row as Record<string, unknown>)[`${baseKey}Forecast`] = forecast.value;

      const budget = parseOptionalColumn(raw, fields, budgetColumn(field), commaAsDecimal, lineNo, errors);
      if (!budget.ok) rowValid = false;
      (row as Record<string, unknown>)[`${baseKey}Budget`] = budget.value;
    }
    if (!rowValid) return;

    seen.add(key);
    rows.push(row as KpiRow);
  });

  return { rows, errors };
}

const VALID_STATUS: Status[] = ["Rot", "Gelb", "Gruen", "Blau"];
const VALID_PRIORITAET: Prioritaet[] = ["Hoch", "Mittel", "Niedrig"];

export function parseStatusCsv(csvText: string): ParseResult<StatusRow> {
  const { data, fields, errors } = parseCsv(csvText);

  const missing = STATUS_REQUIRED_COLUMNS.filter((c) => !fields.includes(c));
  if (missing.length > 0) {
    return { rows: [], errors: [...errors, `Fehlende Spalte(n): ${missing.join(", ")}`] };
  }

  const rows: StatusRow[] = [];
  const seen = new Set<string>();

  data.forEach((raw, i) => {
    const lineNo = i + 2;
    const gesellschaft = raw["Gesellschaft"]?.trim() ?? "";
    const thema = raw["Thema"]?.trim() ?? "";
    const status = raw["Status"]?.trim() ?? "";
    const prioritaet = raw["Prioritaet"]?.trim() ?? "";
    const zieltermin = raw["Zieltermin"]?.trim() ?? "";

    if (!GESELLSCHAFTEN.includes(gesellschaft as Gesellschaft)) {
      errors.push(`Zeile ${lineNo}: unbekannte Gesellschaft "${gesellschaft}"`);
      return;
    }
    if (!thema) {
      errors.push(`Zeile ${lineNo}: "Thema" darf nicht leer sein`);
      return;
    }
    if (!VALID_STATUS.includes(status as Status)) {
      errors.push(`Zeile ${lineNo}: ungültiger Status "${status}" (erwartet Rot/Gelb/Gruen/Blau)`);
      return;
    }
    if (!VALID_PRIORITAET.includes(prioritaet as Prioritaet)) {
      errors.push(`Zeile ${lineNo}: ungültige Priorität "${prioritaet}" (erwartet Hoch/Mittel/Niedrig)`);
      return;
    }
    if (zieltermin !== "" && !DATUM_PATTERN.test(zieltermin)) {
      errors.push(`Zeile ${lineNo}: ungültiges Zieltermin-Format "${zieltermin}" (erwartet YYYY-MM-DD)`);
      return;
    }

    const key = `${gesellschaft}|${thema}`;
    if (seen.has(key)) {
      errors.push(`Zeile ${lineNo}: doppelte Kombination Gesellschaft+Thema (${gesellschaft}, ${thema})`);
      return;
    }
    seen.add(key);

    const kommentarRaw = fields.includes("Kommentar") ? (raw["Kommentar"]?.trim() ?? "") : "";

    rows.push({
      gesellschaft: gesellschaft as Gesellschaft,
      thema,
      status: status as Status,
      verantwortlicher: raw["Verantwortlicher"]?.trim() ?? "",
      naechsterSchritt: raw["Naechster_Schritt"]?.trim() ?? "",
      prioritaet: prioritaet as Prioritaet,
      zieltermin: zieltermin === "" ? null : zieltermin,
      kommentar: kommentarRaw === "" ? null : kommentarRaw,
    });
  });

  return { rows, errors };
}
