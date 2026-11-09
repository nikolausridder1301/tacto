import { describe, expect, it } from "vitest";
import { GESELLSCHAFTEN, parseKpiCsv, parseStatusCsv } from "./index";

describe("Projektgrundgerüst", () => {
  it("kennt die 7 Gesellschaften aus SPEC.md", () => {
    expect(GESELLSCHAFTEN).toHaveLength(7);
    expect(GESELLSCHAFTEN).toContain("HAZEMAG & EPR");
    expect(GESELLSCHAFTEN).toContain("HAZEMAG Systems");
    expect(GESELLSCHAFTEN).toContain("Maximator Hydrogen");
    expect(GESELLSCHAFTEN).toContain("FEST");
  });
});

const KPI_HEADER =
  "Monat,Gesellschaft,KPI_Bestellvolumen_EUR,KPI_Einsparungen_EUR,KPI_Verhandlungen,KPI_Verhandlungsquote_Prozent,KPI_Datenqualitaet_Prozent,KPI_Liefertreue_Prozent,KPI_Mengentreue_Prozent";

describe("parseKpiCsv", () => {
  it("parst eine gültige, komma-getrennte Datei", () => {
    const csv = `${KPI_HEADER}\n2027-01,Maximator Hydrogen,1320000,38000,2,9.8,82,78,96`;
    const { rows, errors } = parseKpiCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      monat: "2027-01",
      gesellschaft: "Maximator Hydrogen",
      bestellvolumenEur: 1320000,
      verhandlungen: 2,
      mengentreueProzent: 96,
    });
    // Keine Forecast-/Budget-Spalten in der Datei -> beide null, kein Fehler.
    expect(rows[0].bestellvolumenEurForecast).toBeNull();
    expect(rows[0].bestellvolumenEurBudget).toBeNull();
  });

  it("erkennt Semikolon-Trennzeichen und normalisiert Komma-Dezimalwerte (deutscher Excel-Export)", () => {
    const header = KPI_HEADER.replace(/,/g, ";");
    const csv = `${header}\n2027-01;HAZEMAG & EPR;1.190.000;0;3;10,7;82,5;80;97`;
    const { rows, errors } = parseKpiCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].bestellvolumenEur).toBe(1190000);
    expect(rows[0].datenqualitaetProzent).toBe(82.5);
    expect(rows[0].verhandlungsquoteProzent).toBe(10.7);
  });

  it("erlaubt leere Ist-Zellen (z.B. nur Jahresziel als Budget vorhanden)", () => {
    const header = `${KPI_HEADER},KPI_Bestellvolumen_EUR_Budget`;
    const csv = `${header}\n2027-01,Allmineral,,,,,,,,458333`;
    const { rows, errors } = parseKpiCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].bestellvolumenEur).toBeNull();
    expect(rows[0].liefertreueProzent).toBeNull();
    expect(rows[0].bestellvolumenEurBudget).toBe(458333);
  });

  it("lehnt ungültige Monatsformate ab", () => {
    const csv = `${KPI_HEADER}\n2027-13,Maximator,1,1,1,1,1,1,1`;
    const { rows, errors } = parseKpiCsv(csv);
    expect(rows).toEqual([]);
    expect(errors.some((e) => e.includes("ungültiger Monat"))).toBe(true);
  });

  it("meldet fehlende Pflichtspalten", () => {
    const { rows, errors } = parseKpiCsv("Monat,Gesellschaft\n2027-01,Allmineral");
    expect(rows).toEqual([]);
    expect(errors.some((e) => e.includes("Fehlende Spalte"))).toBe(true);
  });

  it("lehnt unbekannte Gesellschaften ab", () => {
    const csv = `${KPI_HEADER}\n2027-01,Unbekannt-AG,1,1,1,1,1,1,1`;
    const { rows, errors } = parseKpiCsv(csv);
    expect(rows).toEqual([]);
    expect(errors.some((e) => e.includes("unbekannte Gesellschaft"))).toBe(true);
  });

  it("lehnt doppelte Monat+Gesellschaft-Kombinationen ab", () => {
    const row = "2027-01,Maximator,1,1,1,1,1,1,1";
    const csv = `${KPI_HEADER}\n${row}\n${row}`;
    const { rows, errors } = parseKpiCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors.some((e) => e.includes("doppelte Kombination"))).toBe(true);
  });

  it("lehnt nicht-numerische KPI-Werte ab", () => {
    const csv = `${KPI_HEADER}\n2027-01,Maximator,abc,1,1,1,1,1,1`;
    const { rows, errors } = parseKpiCsv(csv);
    expect(rows).toEqual([]);
    expect(errors.some((e) => e.includes("kein gültiger Zahlenwert"))).toBe(true);
  });
});

describe("parseKpiCsv – Forecast-/Budget-Spalten", () => {
  const HEADER_WITH_FC_BU = `${KPI_HEADER.replace(
    "KPI_Bestellvolumen_EUR,",
    "KPI_Bestellvolumen_EUR,KPI_Bestellvolumen_EUR_Forecast,KPI_Bestellvolumen_EUR_Budget,",
  ).replace("KPI_Verhandlungen,", "KPI_Verhandlungen,KPI_Verhandlungen_Forecast,KPI_Verhandlungen_Budget,")}`;

  it("parst vorhandene Forecast- und Budget-Werte", () => {
    const csv = `${HEADER_WITH_FC_BU}\n2027-01,Maximator,2900000,2930000,3020000,15000,2,3,4,10,85,80,97`;
    const { rows, errors } = parseKpiCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].bestellvolumenEurForecast).toBe(2930000);
    expect(rows[0].bestellvolumenEurBudget).toBe(3020000);
    expect(rows[0].verhandlungenForecast).toBe(3);
    expect(rows[0].verhandlungenBudget).toBe(4);
  });

  it("behandelt leere Forecast-/Budget-Zellen als null, nicht als Fehler", () => {
    const csv = `${HEADER_WITH_FC_BU}\n2027-01,Maximator,2900000,,,15000,2,,,10,85,80,97`;
    const { rows, errors } = parseKpiCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].bestellvolumenEurForecast).toBeNull();
    expect(rows[0].bestellvolumenEurBudget).toBeNull();
  });

  it("lehnt nicht-numerische Forecast-Werte ab", () => {
    const csv = `${HEADER_WITH_FC_BU}\n2027-01,Maximator,2900000,abc,3020000,15000,2,3,4,10,85,80,97`;
    const { rows, errors } = parseKpiCsv(csv);
    expect(rows).toEqual([]);
    expect(errors.some((e) => e.includes("KPI_Bestellvolumen_EUR_Forecast") && e.includes("kein gültiger Zahlenwert"))).toBe(true);
  });
});

const STATUS_HEADER = "Gesellschaft,Thema,Status,Verantwortlicher,Naechster_Schritt,Prioritaet,Zieltermin";

describe("parseStatusCsv", () => {
  it("parst eine gültige Datei (SPEC.md-Beispiel)", () => {
    const csv = `${STATUS_HEADER}\nHAZEMAG Systems,Auftragsbestaetigungen,Gelb,N. Ridder,ERP-Integration klaeren,Hoch,2026-10-15`;
    const { rows, errors } = parseStatusCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ gesellschaft: "HAZEMAG Systems", status: "Gelb", zieltermin: "2026-10-15" });
  });

  it("erlaubt leeren Zieltermin", () => {
    const csv = `${STATUS_HEADER}\nMaximator,Warengruppen,Gruen,N. Ridder,Pflege abschliessen,Mittel,`;
    const { rows, errors } = parseStatusCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].zieltermin).toBeNull();
  });

  it("lehnt ungültige Status-Werte ab", () => {
    const csv = `${STATUS_HEADER}\nMaximator,Warengruppen,Lila,N. Ridder,x,Mittel,`;
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

  it("akzeptiert den Status Blau (2. Welle)", () => {
    const csv = `${STATUS_HEADER}\nPerforator,Analytics,Blau,N. Ridder,Noch nicht gestartet,Niedrig,`;
    const { rows, errors } = parseStatusCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ gesellschaft: "Perforator", status: "Blau" });
  });
});

describe("parseStatusCsv – optionale Kommentar-Spalte", () => {
  const HEADER_WITH_KOMMENTAR = `${STATUS_HEADER},Kommentar`;

  it("liest einen vorhandenen Kommentar", () => {
    const csv = `${HEADER_WITH_KOMMENTAR}\nMaximator,Warengruppen,Gruen,N. Ridder,x,Mittel,,Läuft bei allen Einheiten.`;
    const { rows, errors } = parseStatusCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].kommentar).toBe("Läuft bei allen Einheiten.");
  });

  it("behandelt eine leere Kommentar-Zelle als null", () => {
    const csv = `${HEADER_WITH_KOMMENTAR}\nMaximator,Warengruppen,Gruen,N. Ridder,x,Mittel,,`;
    const { rows, errors } = parseStatusCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].kommentar).toBeNull();
  });

  it("liefert null, wenn die Spalte komplett fehlt", () => {
    const csv = `${STATUS_HEADER}\nMaximator,Warengruppen,Gruen,N. Ridder,x,Mittel,`;
    const { rows, errors } = parseStatusCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].kommentar).toBeNull();
  });
});
