export function getCurrentQuarterRange(now = new Date()) {
  const year = now.getUTCFullYear();
  const q = Math.floor(now.getUTCMonth() / 3);
  const start = new Date(Date.UTC(year, q * 3, 1));
  const end = new Date(Date.UTC(year, q * 3 + 3, 0));
  return { start, end };
}

export function quarterKey(d: Date) {
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

export function quarterLabel(key: string) {
  const [year, q] = key.split("-");
  return `${q} ${year}`;
}

// Day number of today counted from `start` (start itself is day 1).
export function dayNumberSince(start: Date) {
  return Math.floor((Date.now() - start.getTime()) / 86_400_000) + 1;
}

export function quarterDays(d: Date) {
  const { start, end } = getCurrentQuarterRange(d);
  return (end.getTime() - start.getTime()) / 86_400_000 + 1;
}

function parseDateStr(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseDateRange(params: { from?: string; to?: string }) {
  const from = parseDateStr(params.from);
  const to = parseDateStr(params.to);
  if (from && to && from <= to) return { start: from, end: to };
  return getCurrentQuarterRange();
}

export function formatRangeLabel(start: Date, end: Date) {
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function weekStart(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

export function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function weeksElapsedInRange(start: Date, end: Date) {
  const now = new Date();
  return weeksInRange(start, now < end ? now : end);
}

export function weeksInRange(start: Date, end: Date) {
  const weeks: string[] = [];
  let cur = new Date(weekStart(toDateStr(start)));
  const last = new Date(weekStart(toDateStr(end)));
  while (cur <= last) {
    weeks.push(toDateStr(cur));
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate() + 7));
  }
  return weeks;
}
