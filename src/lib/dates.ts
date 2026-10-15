/** Calendar-date helpers (all local time). Months are 0-11 like JS Date. */

export interface YMD {
  y: number;
  m: number;
  d: number;
}

export const ymdOf = (value: number | Date): YMD => {
  const date = typeof value === "number" ? new Date(value) : value;
  return { y: date.getFullYear(), m: date.getMonth(), d: date.getDate() };
};

export const todayYMD = (now: Date = new Date()): YMD => ymdOf(now);

export const sameDay = (a: YMD, b: YMD) =>
  a.y === b.y && a.m === b.m && a.d === b.d;

/** Negative if a is before b, 0 if the same day, positive if after. */
export const compareYMD = (a: YMD, b: YMD) =>
  a.y - b.y || a.m - b.m || a.d - b.d;

export const isFuture = (day: YMD, today: YMD) => compareYMD(day, today) > 0;

export const addDays = (day: YMD, n: number): YMD =>
  ymdOf(new Date(day.y, day.m, day.d + n));

export const daysInMonth = (y: number, m: number) =>
  new Date(y, m + 1, 0).getDate();

/** 0 = Sunday. */
export const firstWeekday = (y: number, m: number) =>
  new Date(y, m, 1).getDay();

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTHS_SHORT = MONTHS.map((n) => n.slice(0, 3));

export const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Cells for a month grid: leading blanks (null) then day numbers, padded to full weeks. */
export function buildMonthGrid(y: number, m: number): (number | null)[] {
  const cells: (number | null)[] = Array(firstWeekday(y, m)).fill(null);
  for (let d = 1; d <= daysInMonth(y, m); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** The earliest month the picker can navigate to. */
export const MIN_YEAR = 1900;

/** e.g. "Wed, Oct 14, 2026" */
export const formatYMD = (day: YMD) =>
  new Date(day.y, day.m, day.d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/** e.g. "Oct 14, 2026" from a timestamp, in local time. */
export const formatTimestamp = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/**
 * Turns a chosen calendar day into a timestamp.
 * - Today keeps the real current time.
 * - Re-selecting the day of an existing timestamp keeps that timestamp.
 * - Any other day is stored at local noon so time zones can never shift its date.
 */
export function toTimestamp(
  day: YMD,
  options: { now?: Date; existing?: number | null } = {},
): number {
  const now = options.now ?? new Date();
  if (sameDay(day, todayYMD(now))) return now.getTime();
  if (options.existing != null && sameDay(day, ymdOf(options.existing))) {
    return options.existing;
  }
  return new Date(day.y, day.m, day.d, 12, 0, 0, 0).getTime();
}
