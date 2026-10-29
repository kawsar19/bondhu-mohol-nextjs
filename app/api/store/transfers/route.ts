import { Types } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { parseDateRange } from '@/lib/date-range'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { Ingredient } from '@/lib/models/ingredient'
import { Section } from '@/lib/models/section'
import { StockMovement } from '@/lib/models/stock-movement'
import { STORE_KEEPERS } from '@/lib/permissions'
import { motherStoreStock } from '@/lib/stock'
import { parseTransferInput } from '@/lib/store-input'

type Named = { _id: Types.ObjectId; name: string } | null

// What the mother store sent to the sections in a date range. ?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: Request) {
  const { error } = await requireRole(STORE_KEEPERS)
  if (error) return error

  const t = await getT()
  const range = parseDateRange(new URL(request.url).searchParams, t)
  if (range.error) return NextResponse.json({ error: range.error }, { status: 400 })

  await connectDB()
  const transfers = await StockMovement.find({ type: 'transfer', date: { $gte: range.start, $lt: range.end } })
    .sort({ date: -1, createdAt: -1 })
    .limit(2000)
    .populate<{ ingredient: (Named & { unit: string }) | null }>('ingredient', 'name unit')
    .populate<{ section: Named }>('section', 'name')
  return NextResponse.json({
    transfers: transfers.map(m => ({
      _id: m.id,
      date: m.date,
      ingredient: m.ingredient ? { _id: String(m.ingredient._id), name: m.ingredient.name, unit: m.ingredient.unit } : null,
      section: m.section ? { _id: String(m.section._id), name: m.section.name } : null,
      quantity: m.quantity,
      note: m.note,
      addedBy: m.addedBy,
    })),
  })
}

// Sends one or more items to a section. Nothing is sent unless the mother store has enough of every item.
export async function POST(request: Request) {
  const { session, error } = await requireRole(STORE_KEEPERS)
  if (error) return error

  const t = await getT()
  const parsed = parseTransferInput(await request.json().catch(() => null), t)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { date, section: sectionId, items, note } = parsed.data

  await connectDB()
  const [section, ingredients, stock] = await Promise.all([
    Section.findById(sectionId),
    Ingredient.find({ _id: { $in: items.map(i => i.ingredient) } }),
    motherStoreStock(),
  ])
  if (!section || !section.isActive) return NextResponse.json({ error: t('store.api.sectionGone') }, { status: 400 })
  const byId = new Map(ingredients.map(i => [i.id, i]))
  for (const item of items) {
    const ingredient = byId.get(item.ingredient)
    if (!ingredient) return NextResponse.json({ error: t('store.api.ingredientGone') }, { status: 400 })
    const have = stock.get(item.ingredient)?.stock ?? 0
    if (item.quantity > have + 0.0005) {
      return NextResponse.json({ error: t('store.api.notEnough', { name: ingredient.name, have: Math.max(have, 0), unit: t(`ingredients.units.${ingredient.unit}`) }) }, { status: 409 })
    }
  }

  await StockMovement.insertMany(items.map(item => ({ date, type: 'transfer', ingredient: item.ingredient, section: section._id, quantity: item.quantity, note, addedBy: session.name })))
  return NextResponse.json({ ok: true }, { status: 201 })
}
