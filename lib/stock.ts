import 'server-only'
import { Types } from 'mongoose'
import { StockMovement } from './models/stock-movement'
import { DAY_MS } from './time'

// Movements that change the mother store, and by how much: purchases and hand counts there add
// (an adjust is already signed), transfers out to a section take away.
const MOTHER_STORE_MATCH = { $or: [{ type: 'transfer' }, { section: null, type: { $in: ['purchase', 'adjust'] } }] }
const MOTHER_STORE_DELTA = { $cond: [{ $eq: ['$type', 'transfer'] }, { $multiply: ['$quantity', -1] }, '$quantity'] }

export type MotherStock = { stock: number; bought: number; spent: number }

/**
 * Mother store stock per ingredient id, with total quantity bought and taka spent for the average price.
 * With `before`, only movements dated earlier count: the stock as it was at that moment.
 */
export async function motherStoreStock(ingredient?: Types.ObjectId | string, before?: Date) {
  // Aggregation doesn't cast like find() does, so the id must already be an ObjectId.
  const match = {
    ...MOTHER_STORE_MATCH,
    ...(ingredient ? { ingredient: new Types.ObjectId(String(ingredient)) } : {}),
    ...(before ? { date: { $lt: before } } : {}),
  }
  const rows: { _id: Types.ObjectId; stock: number; bought: number; spent: number }[] = await StockMovement.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$ingredient',
        stock: { $sum: MOTHER_STORE_DELTA },
        bought: { $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, '$quantity', 0] } },
        spent: { $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, '$cost', 0] } },
      },
    },
  ])
  // Rounded so float sums like 0.1 + 0.2 don't show as 0.30000000000000004.
  return new Map<string, MotherStock>(rows.map(r => [String(r._id), { stock: Math.round(r.stock * 1000) / 1000, bought: r.bought, spent: r.spent }]))
}

// Movements that change a section's kitchen stock: transfers in and hand counts there add, use takes away.
const SECTION_DELTA = { $cond: [{ $eq: ['$type', 'use'] }, { $multiply: ['$quantity', -1] }, '$quantity'] }

/** Kitchen stock per section id, then per ingredient id. Ingredients a section never had are left out. `before` works as above. */
export async function sectionStock(filter?: { section: Types.ObjectId | string; ingredient: Types.ObjectId | string }, before?: Date) {
  const match = {
    ...(filter ? { section: new Types.ObjectId(String(filter.section)), ingredient: new Types.ObjectId(String(filter.ingredient)) } : { section: { $ne: null } }),
    ...(before ? { date: { $lt: before } } : {}),
  }
  const rows: { _id: { section: Types.ObjectId; ingredient: Types.ObjectId }; stock: number }[] = await StockMovement.aggregate([
    { $match: { ...match, type: { $in: ['transfer', 'use', 'adjust'] } } },
    { $group: { _id: { section: '$section', ingredient: '$ingredient' }, stock: { $sum: SECTION_DELTA } } },
  ])
  const bySection = new Map<string, Map<string, number>>()
  for (const r of rows) {
    const section = String(r._id.section)
    if (!bySection.has(section)) bySection.set(section, new Map())
    bySection.get(section)!.set(String(r._id.ingredient), Math.round(r.stock * 1000) / 1000)
  }
  return bySection
}

export type DayBalance = { opening: number; received: number; available: number }

/**
 * Per ingredient, a section's stock for one day before its daily entry: what was left from earlier days,
 * what was sent in that day, and what there should be at the end of it before any use is taken off.
 * The day's own entry is left out, so saving it again starts from the same numbers.
 */
export async function sectionDayBalances(section: Types.ObjectId | string, day: Date, exclude?: Types.ObjectId | null) {
  const end = new Date(day.getTime() + DAY_MS)
  const rows: { _id: Types.ObjectId; opening: number; received: number; available: number }[] = await StockMovement.aggregate([
    { $match: { section: new Types.ObjectId(String(section)), date: { $lt: end }, type: { $in: ['transfer', 'use', 'adjust'] }, ...(exclude ? { sectionDay: { $ne: exclude } } : {}) } },
    {
      $group: {
        _id: '$ingredient',
        opening: { $sum: { $cond: [{ $lt: ['$date', day] }, SECTION_DELTA, 0] } },
        received: { $sum: { $cond: [{ $and: [{ $gte: ['$date', day] }, { $eq: ['$type', 'transfer'] }] }, '$quantity', 0] } },
        available: { $sum: SECTION_DELTA },
      },
    },
  ])
  const round = (n: number) => Math.round(n * 1000) / 1000
  return new Map<string, DayBalance>(rows.map(r => [String(r._id), { opening: round(r.opening), received: round(r.received), available: round(r.available) }]))
}
