// Bangladesh time is UTC+6 with no daylight saving. Servers usually run in UTC,
// so "today" has to be worked out explicitly or the day would start at 6 AM.
const OFFSET_MS = 6 * 60 * 60 * 1000
export const DAY_MS = 24 * 60 * 60 * 1000

/** Midnight (Bangladesh time) at the start of the day containing `date`. */
export function startOfBusinessDay(date = new Date()) {
  return new Date(Math.floor((date.getTime() + OFFSET_MS) / DAY_MS) * DAY_MS - OFFSET_MS)
}
