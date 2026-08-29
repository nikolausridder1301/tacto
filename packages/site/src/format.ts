const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

const millionenFormatter = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

export function formatEur(n: number): string {
  return eurFormatter.format(n);
}

/** Kompakte Darstellung in Millionen für Achsenbeschriftungen, z.B. "17 Mio. €". */
export function formatEurMio(n: number): string {
  return `${millionenFormatter.format(n / 1_000_000)} Mio. €`;
}

export function formatPercent(n: number): string {
  return `${numberFormatter.format(n)} %`;
}

export function formatNumber(n: number): string {
  return numberFormatter.format(n);
}

const MONATE_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

/** z.B. "2026-09" -> "Sep 26" – für Chart-Beschriftungen. */
export function formatMonatKurz(monat: string): string {
  const [year, m] = monat.split("-");
  return `${MONATE_KURZ[Number(m) - 1]} ${year.slice(2)}`;
}

/** z.B. "2026-Q3" -> "Q3 26" – für Tabellen-/Chart-Beschriftungen. */
export function formatQuartalKurz(quartal: string): string {
  const [year, q] = quartal.split("-Q");
  return `${q ? `Q${q}` : quartal} ${year.slice(2)}`;
}

/** z.B. "2026-Q3" -> "Q3 2026" – ausführlicher, für Auswahl/Überschriften. */
export function formatQuartal(quartal: string): string {
  const [year, q] = quartal.split("-Q");
  return `Q${q} ${year}`;
}

export function formatDatum(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Datum und Uhrzeit, z.B. "29.08.2026, 09:22" – für den "Letztes Update"-Hinweis. */
export function formatDatumZeit(date: Date): string {
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Escaped Text für sichere Verwendung in innerHTML-Strings (Daten kommen aus hochgeladenen CSVs). */
export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
