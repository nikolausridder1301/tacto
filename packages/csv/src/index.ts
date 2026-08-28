// Datenmodell und Validierung für kpis.csv / status.csv.
// Wird sowohl vom Seiten-Build (packages/site) als auch vom Upload-Worker
// (packages/worker) verwendet, damit es nur eine Quelle der Wahrheit gibt.

import Papa from "papaparse";

export const GESELLSCHAFTEN = [
  "HAZEMAG",
  "Allmineral",
  "Hazemag Systems",
  "Maximator",
  "Maximator Hydrogen",
  "FEST",
] as const;

export type Gesellschaft = (typeof GESELLSCHAFTEN)[number];

export interface KpiRow {
  monat: string; // "YYYY-MM"
  gesellschaft: Gesellschaft;
  einkaufsvolumenEur: number;
  einkaufsvolumenEurPlan: number | null;
  einsparungMonatEur: number;
  einsparungMonatEurPlan: number | null;
  einsparungKumulativEur: number;
  einsparungKumulativEurPlan: number | null;
  einsparquoteProzent: number;
  einsparquoteProzentPlan: number | null;
  zeitersparnisStd: number;
  zeitersparnisStdPlan: number | null;
  rfqsAbgeschlossen: number;
  rfqsAbgeschlossenPlan: number | null;
  aktiveLieferanten: number;
  aktiveLieferantenPlan: number | null;
  datenqualitaetProzent: number;
  datenqualitaetProzentPlan: number | null;
  aktiveNutzer: number;
  aktiveNutzerPlan: number | null;
}

export type Status = "Rot" | "Gelb" | "Gruen";
export type Prioritaet = "Hoch" | "Mittel" | "Niedrig";

export interface StatusRow {
  gesellschaft: Gesellschaft;
  thema: string;
  status: Status;
  verantwortlicher: string;
  naechsterSchritt: string;
  prioritaet: Prioritaet;
  zieltermin: string | null; // "YYYY-MM-DD" oder null
}

export interface ParseResult<T> {
  rows: T[];
  errors: string[];
}

const KPI_NUMERIC_FIELDS = [
  "KPI_Einkaufsvolumen_EUR",
  "KPI_Einsparung_Monat_EUR",
  "KPI_Einsparung_Kumulativ_EUR",
  "KPI_Einsparquote_Prozent",
  "KPI_Zeitersparnis_Std",
  "KPI_RFQs_Abgeschlossen",
  "KPI_Aktive_Lieferanten",
  "KPI_Datenqualitaet_Prozent",
  "KPI_Aktive_Nutzer",
] as const;

/**
 * Plan-Gegenstück je KPI-Spalte, z.B. "KPI_Einkaufsvolumen_EUR_Plan".
 * Optional: fehlt die Spalte komplett, wird kein Plan-Wert erwartet. Ist sie
 * vorhanden, ist die Zelle pro Zeile trotzdem optional (leer = kein Plan-Wert
 * für diesen Monat/diese Gesellschaft).
 */
function planColumn(field: (typeof KPI_NUMERIC_FIELDS)[number]): string {
  return `${field}_Plan`;
}

const KPI_REQUIRED_COLUMNS = ["Monat", "Gesellschaft", ...KPI_NUMERIC_FIELDS];
const STATUS_REQUIRED_COLUMNS = [
  "Gesellschaft",
  "Thema",
  "Status",
  "Verantwortlicher",
  "Naechster_Schritt",
  "Prioritaet",
  "Zieltermin",
];

const MONAT_PATTERN = /^\d{4}-\d{2}$/;
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

    const values: Partial<Record<(typeof KPI_NUMERIC_FIELDS)[number], number>> = {};
    const planValues: Partial<Record<(typeof KPI_NUMERIC_FIELDS)[number], number | null>> = {};
    let rowValid = true;
    for (const field of KPI_NUMERIC_FIELDS) {
      const n = parseLocaleNumber(raw[field] ?? "", commaAsDecimal);
      if (!Number.isFinite(n)) {
        errors.push(`Zeile ${lineNo}: Spalte "${field}" ist kein gültiger Zahlenwert ("${raw[field]}")`);
        rowValid = false;
        continue;
      }
      values[field] = n;

      const planField = planColumn(field);
      if (fields.includes(planField)) {
        const rawPlan = (raw[planField] ?? "").trim();
        if (rawPlan === "") {
          planValues[field] = null;
        } else {
          const p = parseLocaleNumber(rawPlan, commaAsDecimal);
          if (!Number.isFinite(p)) {
            errors.push(`Zeile ${lineNo}: Spalte "${planField}" ist kein gültiger Zahlenwert ("${raw[planField]}")`);
            rowValid = false;
          } else {
            planValues[field] = p;
          }
        }
      } else {
        planValues[field] = null;
      }
    }
    if (!rowValid) return;

    seen.add(key);
    rows.push({
      monat,
      gesellschaft: gesellschaft as Gesellschaft,
      einkaufsvolumenEur: values["KPI_Einkaufsvolumen_EUR"]!,
      einkaufsvolumenEurPlan: planValues["KPI_Einkaufsvolumen_EUR"] ?? null,
      einsparungMonatEur: values["KPI_Einsparung_Monat_EUR"]!,
      einsparungMonatEurPlan: planValues["KPI_Einsparung_Monat_EUR"] ?? null,
      einsparungKumulativEur: values["KPI_Einsparung_Kumulativ_EUR"]!,
      einsparungKumulativEurPlan: planValues["KPI_Einsparung_Kumulativ_EUR"] ?? null,
      einsparquoteProzent: values["KPI_Einsparquote_Prozent"]!,
      einsparquoteProzentPlan: planValues["KPI_Einsparquote_Prozent"] ?? null,
      zeitersparnisStd: values["KPI_Zeitersparnis_Std"]!,
      zeitersparnisStdPlan: planValues["KPI_Zeitersparnis_Std"] ?? null,
      rfqsAbgeschlossen: values["KPI_RFQs_Abgeschlossen"]!,
      rfqsAbgeschlossenPlan: planValues["KPI_RFQs_Abgeschlossen"] ?? null,
      aktiveLieferanten: values["KPI_Aktive_Lieferanten"]!,
      aktiveLieferantenPlan: planValues["KPI_Aktive_Lieferanten"] ?? null,
      datenqualitaetProzent: values["KPI_Datenqualitaet_Prozent"]!,
      datenqualitaetProzentPlan: planValues["KPI_Datenqualitaet_Prozent"] ?? null,
      aktiveNutzer: values["KPI_Aktive_Nutzer"]!,
      aktiveNutzerPlan: planValues["KPI_Aktive_Nutzer"] ?? null,
    });
  });

  return { rows, errors };
}

const VALID_STATUS: Status[] = ["Rot", "Gelb", "Gruen"];
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
      errors.push(`Zeile ${lineNo}: ungültiger Status "${status}" (erwartet Rot/Gelb/Gruen)`);
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

    rows.push({
      gesellschaft: gesellschaft as Gesellschaft,
      thema,
      status: status as Status,
      verantwortlicher: raw["Verantwortlicher"]?.trim() ?? "",
      naechsterSchritt: raw["Naechster_Schritt"]?.trim() ?? "",
      prioritaet: prioritaet as Prioritaet,
      zieltermin: zieltermin === "" ? null : zieltermin,
    });
  });

  return { rows, errors };
}
