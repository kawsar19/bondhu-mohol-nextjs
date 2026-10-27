import { DAY_MS, parseBusinessDate } from './time'

const MAX_DAYS = 400

/** Reads ?from=YYYY-MM-DD&to=YYYY-MM-DD (both Bangladesh dates, inclusive) into a [start, end) range. */
export function parseDateRange(params: URLSearchParams): { start: Date; end: Date; error?: never } | { start?: never; end?: never; error: string } {
  const start = parseBusinessDate(params.get('from'))
  const last = parseBusinessDate(params.get('to'))
  if (!start || !last) return { error: 'Choose a valid from and to date' }
  if (last < start) return { error: 'The "to" date is before the "from" date' }
  const end = new Date(last.getTime() + DAY_MS)
  if (end.getTime() - start.getTime() > MAX_DAYS * DAY_MS) return { error: `Choose a range of ${MAX_DAYS} days or less` }
  return { start, end }
}
