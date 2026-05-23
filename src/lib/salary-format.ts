/** Strip commas and parse a non-negative number from a salary input field. */
export function parseFormattedAmount(raw: string): number | null {
  const s = raw.replace(/,/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Format integer/float amounts with thousands separators for display in inputs. */
export function formatAmountWithCommas(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  const parts = String(value).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

/** Read-only display for salary figures (no currency symbol). */
export function formatSalaryDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return formatAmountWithCommas(value);
}

/** Fixed locale so SSR and browser hydration produce identical currency strings. */
const MONEY_LOCALE = "en-US";

export function formatCurrency(amount: number, currency: string): string {
  const n = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(MONEY_LOCALE, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${Math.round(n).toLocaleString(MONEY_LOCALE)}`;
  }
}

const DATE_TIME_OPTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

/** Fixed-locale timestamp for client components (avoids hydration mismatch). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(MONEY_LOCALE, DATE_TIME_OPTS);
}
