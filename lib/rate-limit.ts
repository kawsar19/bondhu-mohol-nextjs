import 'server-only'
import { RateLimit } from './models/rate-limit'

// Kept in MongoDB, not memory, so limits hold across restarts and on serverless hosts.
// Fixed windows: a burst can straddle two windows, which is fine for stopping abuse.

function windowOf(windowMs: number) {
  const start = Math.floor(Date.now() / windowMs) * windowMs
  return { start, end: new Date(start + windowMs) }
}

const minutesUntil = (end: Date) => Math.max(1, Math.ceil((end.getTime() - Date.now()) / 60000))

/** Counts one attempt for `key`. `ok` is false once more than `limit` happened in this window. */
export async function hit(key: string, limit: number, windowMs: number) {
  const { start, end } = windowOf(windowMs)
  const doc = await RateLimit.findOneAndUpdate({ _id: `${key}:${start}` }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: end } }, { upsert: true, new: true })
  return { ok: doc.count <= limit, retryMinutes: minutesUntil(end) }
}

/** Whether `key` has already used up `limit` in this window, without counting a new attempt. */
export async function isBlocked(key: string, limit: number, windowMs: number) {
  const { start, end } = windowOf(windowMs)
  const doc = await RateLimit.findById(`${key}:${start}`).lean()
  return { blocked: (doc?.count ?? 0) >= limit, retryMinutes: minutesUntil(end) }
}

export async function reset(key: string, windowMs: number) {
  await RateLimit.deleteOne({ _id: `${key}:${windowOf(windowMs).start}` })
}

/**
 * The visitor's IP. Behind Nginx this needs `proxy_set_header X-Real-IP $remote_addr;`.
 * Otherwise the right-most X-Forwarded-For entry is used: that one is added by our own
 * proxy, while entries to its left can be typed in by the visitor.
 */
export function clientIp(request: Request) {
  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return real
  const forwarded = request.headers.get('x-forwarded-for')?.split(',').map(s => s.trim()).filter(Boolean)
  return forwarded?.at(-1) ?? 'unknown'
}
