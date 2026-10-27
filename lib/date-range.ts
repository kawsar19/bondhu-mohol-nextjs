import type { TFunction } from './i18n'
import { DAY_MS, parseBusinessDate } from './time'

const MAX_DAYS = 400

/** Reads ?from=YYYY-MM-DD&to=YYYY-MM-DD (both Bangladesh dates, inclusive) into a [start, end) range. */
export function parseDateRange(params: URLSearchParams, t: TFunction): { start: Date; end: Date; error?: never } | { start?: never; end?: never; error: string } {
  const start = parseBusinessDate(params.get('from'))
  const last = parseBusinessDate(params.get('to'))
  if (!start || !last) return { error: t('dates.invalidRange') }
  if (last < start) return { error: t('dates.toBeforeFrom') }
  const end = new Date(last.getTime() + DAY_MS)
  if (end.getTime() - start.getTime() > MAX_DAYS * DAY_MS) return { error: t('dates.rangeTooLong', { max: MAX_DAYS }) }
  return { start, end }
}
