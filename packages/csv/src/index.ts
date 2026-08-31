// Datenmodell und Validierung für kpis.csv / status.csv.
// Wird sowohl vom Seiten-Build (packages/site) als auch vom Upload-Worker
// (packages/worker) verwendet, damit es nur eine Quelle der Wahrheit gibt.

import Papa from "papaparse";

export const GESELLSCHAFTEN = [
  "HAZEMAG",
  "Allmineral",
  "Maximator",
  "Maximator Hydrogen",
  "FEST",
  "Perforator",
] as const;

export type Gesellschaft = (typeof GESELLSCHAFTEN)[number];

const KPI_BASE_FIELDS = [
  "KPI_Einkaufsvolumen_EUR",
  "KPI_Einsparung_Monat_EUR",
  "KPI_Einsparquote_Prozent",
  "KPI_Zeitersparnis_Std",
  "KPI_RFQs_Abgeschlossen",
  "KPI_Aktive_Lieferanten",
  "KPI_Datenqualitaet_Prozent",
  "KPI_Aktive_Nutzer",
] as const;

type KpiBaseField = (typeof KPI_BASE_FIELDS)[number];

function forecastColumn(field: KpiBaseField): string {
  return `${field}_Forecast`;
}
function budgetColumn(field: KpiBaseField): string {
  return `${field}_Budget`;
}

export interface KpiRow {
  monat: string; // "YYYY-MM", z.B. "2026-03"
  gesellschaft: Gesellschaft;
  einkaufsvolumenEur: number;
  einkaufsvolumenEurForecast: number | null;
  einkaufsvolumenEurBudget: number | null;
  einsparungMonatEur: number;
  einsparungMonatEurForecast: number | null;
  einsparungMonatEurBudget: number | null;
  einsparquoteProzent: number;
  einsparquoteProzentForecast: number | null;
  einsparquoteProzentBudget: number | null;
  zeitersparnisStd: number;
  zeitersparnisStdForecast: number | null;
  zeitersparnisStdBudget: number | null;
  rfqsAbgeschlossen: number;
  rfqsAbgeschlossenForecast: number | null;
  rfqsAbgeschlossenBudget: number | null;
  aktiveLieferanten: number;
  aktiveLieferantenForecast: number | null;
  aktiveLieferantenBudget: number | null;
  datenqualitaetProzent: number;
  datenqualitaetProzentForecast: number | null;
  datenqualitaetProzentBudget: number | null;
  aktiveNutzer: number;
  aktiveNutzerForecast: number | null;
  aktiveNutzerBudget: number | null;
}

// Mapping CSV-Basisspalte -> KpiRow-Feldname (camelCase), damit die
// Parse-Schleife unten nicht neunmal denselben Code wiederholt.
const FIELD_MAP: Record<KpiBaseField, keyof KpiRow> = {
  KPI_Einkaufsvolumen_EUR: "einkaufsvolumenEur",
  KPI_Einsparung_Monat_EUR: "einsparungMonatEur",
  KPI_Einsparquote_Prozent: "einsparquoteProzent",
  KPI_Zeitersparnis_Std: "zeitersparnisStd",
  KPI_RFQs_Abgeschlossen: "rfqsAbgeschlossen",
  KPI_Aktive_Lieferanten: "aktiveLieferanten",
  KPI_Datenqualitaet_Prozent: "datenqualitaetProzent",
  KPI_Aktive_Nutzer: "aktiveNutzer",
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
 * Parst eine optionale Zusatzspalte (Forecast/Budget) für eine Zeile. Fehlt
 * die Spalte komplett in der Datei, wird kein Wert erwartet (null). Ist sie
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
      const n = parseLocaleNumber(raw[field] ?? "", commaAsDecimal);
      if (!Number.isFinite(n)) {
        errors.push(`Zeile ${lineNo}: Spalte "${field}" ist kein gültiger Zahlenwert ("${raw[field]}")`);
        rowValid = false;
      } else {
        (row as Record<string, unknown>)[baseKey] = n;
      }

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
