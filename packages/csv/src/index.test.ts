import { describe, expect, it } from "vitest";
import { GESELLSCHAFTEN, parseKpiCsv, parseStatusCsv } from "./index";

describe("Projektgrundgerüst", () => {
  it("kennt die 5 Gesellschaften aus SPEC.md", () => {
    expect(GESELLSCHAFTEN).toHaveLength(5);
    expect(GESELLSCHAFTEN).toContain("HAZEMAG");
    expect(GESELLSCHAFTEN).toContain("FEST");
  });
});

const KPI_HEADER =
  "Monat,Gesellschaft,KPI_Einkaufsvolumen_EUR,KPI_Einkaufsvolumen_Aktiv_Betreut_EUR,KPI_Einsparung_Monat_EUR,KPI_Einsparung_Kumulativ_EUR,KPI_Einsparquote_Prozent,KPI_Zeitersparnis_Std,KPI_RFQs_Abgeschlossen,KPI_Aktive_Lieferanten,KPI_Lieferantenkonzentration_Top20_Prozent,KPI_Datenqualitaet_Prozent,KPI_Aktive_Nutzer";

describe("parseKpiCsv", () => {
  it("parst eine gültige, komma-getrennte Datei (SPEC.md-Beispiel)", () => {
    const csv = `${KPI_HEADER}\n2026-09,Maximator,2916666,1500000,15000,15000,1.0,40,2,85,62,78,6`;
    const { rows, errors } = parseKpiCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      monat: "2026-09",
      gesellschaft: "Maximator",
      einkaufsvolumenEur: 2916666,
      aktiveNutzer: 6,
    });
  });

  it("erkennt Semikolon-Trennzeichen und normalisiert Komma-Dezimalwerte (deutscher Excel-Export)", () => {
    const header = KPI_HEADER.replace(/,/g, ";");
    const csv = `${header}\n2026-09;HAZEMAG;1.200.000;300000;0;0;0,0;10;0;40;55;40;2`;
    const { rows, errors } = parseKpiCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].einkaufsvolumenEur).toBe(1200000);
    expect(rows[0].einsparquoteProzent).toBe(0);
  });

  it("meldet fehlende Pflichtspalten", () => {
    const { rows, errors } = parseKpiCsv("Monat,Gesellschaft\n2026-09,HAZEMAG");
    expect(rows).toEqual([]);
    expect(errors.some((e) => e.includes("Fehlende Spalte"))).toBe(true);
  });

  it("lehnt unbekannte Gesellschaften ab", () => {
    const csv = `${KPI_HEADER}\n2026-09,Unbekannt-AG,1,1,1,1,1,1,1,1,1,1,1`;
    const { rows, errors } = parseKpiCsv(csv);
    expect(rows).toEqual([]);
    expect(errors.some((e) => e.includes("unbekannte Gesellschaft"))).toBe(true);
  });

  it("lehnt doppelte Monat+Gesellschaft-Kombinationen ab", () => {
    const row = "2026-09,Maximator,1,1,1,1,1,1,1,1,1,1,1";
    const csv = `${KPI_HEADER}\n${row}\n${row}`;
    const { rows, errors } = parseKpiCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors.some((e) => e.includes("doppelte Kombination"))).toBe(true);
  });

  it("lehnt nicht-numerische KPI-Werte ab", () => {
    const csv = `${KPI_HEADER}\n2026-09,Maximator,abc,1,1,1,1,1,1,1,1,1,1`;
    const { rows, errors } = parseKpiCsv(csv);
    expect(rows).toEqual([]);
    expect(errors.some((e) => e.includes("kein gültiger Zahlenwert"))).toBe(true);
  });
});

const STATUS_HEADER = "Gesellschaft,Thema,Status,Verantwortlicher,Naechster_Schritt,Prioritaet,Zieltermin";

describe("parseStatusCsv", () => {
  it("parst eine gültige Datei (SPEC.md-Beispiel)", () => {
    const csv = `${STATUS_HEADER}\nHAZEMAG,Auftragsbestaetigungen,Gelb,N. Ridder,ERP-Integration klaeren,Hoch,2026-10-15`;
    const { rows, errors } = parseStatusCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ gesellschaft: "HAZEMAG", status: "Gelb", zieltermin: "2026-10-15" });
  });

  it("erlaubt leeren Zieltermin", () => {
    const csv = `${STATUS_HEADER}\nMaximator,Warengruppen,Gruen,N. Ridder,Pflege abschliessen,Mittel,`;
    const { rows, errors } = parseStatusCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].zieltermin).toBeNull();
  });

  it("lehnt ungültige Status-Werte ab", () => {
    const csv = `${STATUS_HEADER}\nMaximator,Warengruppen,Blau,N. Ridder,x,Mittel,`;
    const { rows, errors } = parseStatusCsv(csv);
    expect(rows).toEqual([]);
    expect(errors.some((e) => e.includes("ungültiger Status"))).toBe(true);
  });

  it("lehnt doppelte Gesellschaft+Thema-Kombinationen ab", () => {
    const row = "Maximator,Warengruppen,Gruen,N. Ridder,x,Mittel,";
    const csv = `${STATUS_HEADER}\n${row}\n${row}`;
    const { rows, errors } = parseStatusCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors.some((e) => e.includes("doppelte Kombination"))).toBe(true);
  });
});
