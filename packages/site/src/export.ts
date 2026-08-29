// Excel-Export der beiden hochgeladenen Rohdateien (Monats-KPIs + Status),
// je Datei ein Tabellenblatt. Die "xlsx"-Bibliothek wird erst bei Bedarf
// nachgeladen (dynamic import), damit sie nicht das normale Seitenladen
// verlangsamt – nur wer tatsächlich exportiert, lädt sie herunter.
export async function exportToExcel(kpiCsv: string | null, statusCsv: string | null): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  if (kpiCsv) {
    const parsed = XLSX.read(kpiCsv, { type: "string" });
    XLSX.utils.book_append_sheet(workbook, parsed.Sheets[parsed.SheetNames[0]], "KPIs (Monat)");
  }
  if (statusCsv) {
    const parsed = XLSX.read(statusCsv, { type: "string" });
    XLSX.utils.book_append_sheet(workbook, parsed.Sheets[parsed.SheetNames[0]], "Status");
  }
  if (workbook.SheetNames.length === 0) return;

  XLSX.writeFile(workbook, "tacto-reporting-export.xlsx");
}
