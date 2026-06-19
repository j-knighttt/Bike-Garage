/** Lightweight date helpers (no external dependency). */

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_MONTH = 30.4375;

export function monthsBetween(fromIso: string, to: Date = new Date()): number {
  const from = new Date(fromIso).getTime();
  if (Number.isNaN(from)) return 0;
  const days = (to.getTime() - from) / MS_PER_DAY;
  return Math.max(0, days / DAYS_PER_MONTH);
}

export function daysBetween(fromIso: string, to: Date = new Date()): number {
  const from = new Date(fromIso).getTime();
  if (Number.isNaN(from)) return 0;
  return Math.max(0, (to.getTime() - from) / MS_PER_DAY);
}

/** Human-friendly "in X" for a positive number of months. */
export function formatMonthsAhead(months: number): string {
  if (months <= 0) return 'jetzt fällig';
  if (months < 1) {
    const weeks = Math.max(1, Math.round(months * 4.345));
    return weeks === 1 ? 'in ~1 Woche' : `in ~${weeks} Wochen`;
  }
  if (months < 12) {
    const m = Math.round(months);
    return m === 1 ? 'in ~1 Monat' : `in ~${m} Monaten`;
  }
  const years = months / 12;
  return years < 2 ? 'in ~1 Jahr' : `in ~${Math.round(years)} Jahren`;
}

/** Human-friendly "in X km" for a positive distance. */
export function formatKmAhead(km: number): string {
  if (km <= 0) return 'jetzt fällig';
  if (km < 100) return `in ~${Math.round(km / 10) * 10} km`;
  return `in ~${Math.round(km / 50) * 50} km`;
}
