import { Types } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { parseDateRange } from '@/lib/date-range'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { Ingredient } from '@/lib/models/ingredient'
import { StockMovement } from '@/lib/models/stock-movement'
import { STORE_KEEPERS } from '@/lib/permissions'
import { motherStoreStock } from '@/lib/stock'
import { parseCountInput } from '@/lib/store-input'
import { startOfBusinessDay } from '@/lib/time'

// Hand-count corrections to the mother store are adjusts with no section and no daily entry.
const MOTHER_COUNTS = { type: 'adjust' as const, section: null, sectionDay: null }

// Corrections from hand counts in a date range. ?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: Request) {
  const { error } = await requireRole(STORE_KEEPERS)
  if (error) return error

  const t = await getT()
  const range = parseDateRange(new URL(request.url).searchParams, t)
  if (range.error) return NextResponse.json({ error: range.error }, { status: 400 })

  await connectDB()
  const counts = await StockMovement.find({ ...MOTHER_COUNTS, date: { $gte: range.start, $lt: range.end } })
    .sort({ date: -1, createdAt: -1 })
    .limit(2000)
    .populate<{ ingredient: { _id: Types.ObjectId; name: string; unit: string } | null }>('ingredient', 'name unit')
  return NextResponse.json({
    counts: counts.map(c => ({
      _id: c.id,
      date: c.date,
      ingredient: c.ingredient ? { _id: String(c.ingredient._id), name: c.ingredient.name, unit: c.ingredient.unit } : null,
      quantity: c.quantity,
      note: c.note,
      addedBy: c.addedBy,
    })),
  })
}

// Records what was found on the shelves today. Only the difference from the books is saved, as a signed adjust.
export async function POST(request: Request) {
  const { session, error } = await requireRole(STORE_KEEPERS)
  if (error) return error

  const t = await getT()
  const parsed = parseCountInput(await request.json().catch(() => null), t)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { items, note } = parsed.data

  await connectDB()
  const [found, stock] = await Promise.all([Ingredient.countDocuments({ _id: { $in: items.map(i => i.ingredient) } }), motherStoreStock()])
  if (found !== items.length) return NextResponse.json({ error: t('store.api.ingredientGone') }, { status: 400 })

  const date = startOfBusinessDay()
  const adjusts = items
    .map(i => ({ ingredient: i.ingredient, quantity: Math.round((i.counted - (stock.get(i.ingredient)?.stock ?? 0)) * 1000) / 1000 }))
    .filter(a => Math.abs(a.quantity) >= 0.0005)
  if (adjusts.length) await StockMovement.insertMany(adjusts.map(a => ({ ...MOTHER_COUNTS, date, ingredient: a.ingredient, quantity: a.quantity, note, addedBy: session.name })))
  return NextResponse.json({ changed: adjusts.length }, { status: 201 })
}
