import { isValidObjectId, Types } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { Ingredient } from '@/lib/models/ingredient'
import { MenuItem } from '@/lib/models/menu-item'
import { Section } from '@/lib/models/section'
import { SectionDay } from '@/lib/models/section-day'
import { StockMovement } from '@/lib/models/stock-movement'
import { parseSectionDayInput } from '@/lib/section-day-input'
import { sectionDayBalances } from '@/lib/stock'
import { isDuplicateKeyError } from '@/lib/table-input'
import { parseBusinessDate } from '@/lib/time'

const round = (n: number) => Math.round(n * 1000) / 1000

// One section's day: stock for each ingredient, the menu items it makes, and what was saved for that day if anything.
// ?section=<id>&date=YYYY-MM-DD
export async function GET(request: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const t = await getT()
  const params = new URL(request.url).searchParams
  const sectionId = params.get('section')
  const date = parseBusinessDate(params.get('date'))
  if (!sectionId || !isValidObjectId(sectionId)) return NextResponse.json({ error: t('daily.api.chooseSection') }, { status: 400 })
  if (!date) return NextResponse.json({ error: t('daily.api.invalidDate') }, { status: 400 })

  await connectDB()
  const [section, day] = await Promise.all([Section.findById(sectionId), SectionDay.findOne({ section: sectionId, date })])
  if (!section) return NextResponse.json({ error: t('daily.api.sectionNotFound') }, { status: 404 })
  const [balances, menuItems] = await Promise.all([sectionDayBalances(section._id, date, day?._id), MenuItem.find({ section: section._id }).sort({ name: 1 }).select('name')])

  // Every ingredient the section has had up to this day, plus any on the saved entry.
  const saved = new Map((day?.items ?? []).map(i => [String(i.ingredient), i]))
  const ids = [...new Set([...balances.keys(), ...saved.keys()])]
  const ingredients = await Ingredient.find({ _id: { $in: ids } }).sort({ name: 1 })

  return NextResponse.json({
    section: { _id: section.id, name: section.name },
    rows: ingredients.map(i => {
      const b = balances.get(i.id) ?? { opening: 0, received: 0, available: 0 }
      const s = saved.get(i.id)
      return { ingredient: { _id: i.id, name: i.name, unit: i.unit }, ...b, used: s?.used ?? null, closing: s?.closing ?? null }
    }),
    menuItems: menuItems.map(m => ({ _id: m.id, name: m.name })),
    entry: day ? {
      production: day.production.map(p => ({ menuItem: p.menuItem ? String(p.menuItem) : null, name: p.name, quantity: p.quantity })),
      ownersShare: day.ownersShare.map(s => ({ item: s.item, quantity: s.quantity, takenBy: s.takenBy })),
      note: day.note,
      enteredBy: day.enteredBy,
      updatedAt: day.get('updatedAt'),
    } : null,
  })
}

// Saves (or replaces) a section's day. Use is written as stock movements; counting more than expected is a hand-count adjust.
export async function PUT(request: Request) {
  const { session, error } = await requireAdmin()
  if (error) return error

  const t = await getT()
  const parsed = parseSectionDayInput(await request.json().catch(() => null), t)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { section: sectionId, date, items, production, ownersShare, note } = parsed.data

  await connectDB()
  const [section, existing, ingredients, menuItems] = await Promise.all([
    Section.findById(sectionId),
    SectionDay.findOne({ section: sectionId, date }).select('_id'),
    Ingredient.find({ _id: { $in: items.map(i => i.ingredient) } }),
    MenuItem.find({ _id: { $in: production.map(p => p.menuItem) }, section: sectionId }).select('name'),
  ])
  if (!section) return NextResponse.json({ error: t('daily.api.sectionNotFound') }, { status: 404 })
  if (ingredients.length !== items.length) return NextResponse.json({ error: t('daily.api.ingredientGone') }, { status: 400 })
  if (menuItems.length !== production.length) return NextResponse.json({ error: t('daily.api.menuItemGone') }, { status: 400 })

  const balances = await sectionDayBalances(section._id, date, existing?._id)
  const byId = new Map(ingredients.map(i => [i.id, i]))
  const lines: { ingredient: string; used: number; closing: number; extra: number }[] = []
  for (const item of items) {
    const available = balances.get(item.ingredient)?.available ?? 0
    if (item.closing !== undefined) {
      const used = round(available - item.closing)
      // Counted more than the books say: the difference goes in as a hand-count correction, not negative use.
      lines.push({ ingredient: item.ingredient, used: Math.max(used, 0), closing: item.closing, extra: Math.max(-used, 0) })
    } else {
      const closing = round(available - item.used!)
      if (closing < -0.0005) {
        const ingredient = byId.get(item.ingredient)!
        return NextResponse.json({ error: t('daily.api.usedTooMuch', { name: ingredient.name, have: Math.max(available, 0), unit: t(`ingredients.units.${ingredient.unit}`) }) }, { status: 409 })
      }
      lines.push({ ingredient: item.ingredient, used: item.used!, closing: Math.max(closing, 0), extra: 0 })
    }
  }

  const names = new Map(menuItems.map(m => [m.id, m.name]))
  let day
  try {
    day = await SectionDay.findOneAndUpdate(
      { section: section._id, date },
      {
        $set: {
          items: lines.map(l => ({ ingredient: l.ingredient, used: l.used, closing: l.closing })),
          production: production.map(p => ({ menuItem: p.menuItem, name: names.get(p.menuItem)!, quantity: p.quantity })),
          ownersShare,
          note,
          enteredBy: session.name,
        },
      },
      { upsert: true, new: true, runValidators: true },
    )
  } catch (err) {
    // Two people saved the same new day at once; the other save won.
    if (isDuplicateKeyError(err)) return NextResponse.json({ error: t('daily.api.savedElsewhere') }, { status: 409 })
    throw err
  }

  await StockMovement.deleteMany({ sectionDay: day._id })
  const movements = lines.flatMap(l => [
    ...(l.used > 0 ? [{ type: 'use', quantity: l.used }] : []),
    ...(l.extra > 0 ? [{ type: 'adjust', quantity: l.extra }] : []),
  ].map(m => ({ ...m, date, ingredient: new Types.ObjectId(l.ingredient), section: section._id, sectionDay: day._id, addedBy: session.name })))
  if (movements.length) await StockMovement.insertMany(movements)

  return NextResponse.json({ ok: true })
}
