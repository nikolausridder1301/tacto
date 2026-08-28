const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

export function formatEur(n: number): string {
  return eurFormatter.format(n);
}

export function formatPercent(n: number): string {
  return `${numberFormatter.format(n)} %`;
}

export function formatNumber(n: number): string {
  return numberFormatter.format(n);
}

export function formatMonat(monat: string): string {
  const [year, month] = monat.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("de-DE", { month: "short", year: "numeric" });
}

export function formatDatum(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
