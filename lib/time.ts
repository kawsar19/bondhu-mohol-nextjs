// Bangladesh time is UTC+6 with no daylight saving. Servers usually run in UTC,
// so "today" has to be worked out explicitly or the day would start at 6 AM.
const OFFSET_MS = 6 * 60 * 60 * 1000
export const DAY_MS = 24 * 60 * 60 * 1000

/** Midnight (Bangladesh time) at the start of the day containing `date`. */
export function startOfBusinessDay(date = new Date()) {
  return new Date(Math.floor((date.getTime() + OFFSET_MS) / DAY_MS) * DAY_MS - OFFSET_MS)
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Bangladesh midnight for a "YYYY-MM-DD" date, or null if it isn't a real date. */
export function parseBusinessDate(value: unknown) {
  const match = typeof value === 'string' ? DATE_RE.exec(value) : null
  if (!match) return null
  const [, y, m, d] = match.map(Number)
  const utc = Date.UTC(y, m - 1, d)
  const check = new Date(utc)
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null
  return new Date(utc - OFFSET_MS)
}

/** "YYYY-MM-DD" of the Bangladesh day containing `date`. */
export function businessDateString(date = new Date()) {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10)
}
