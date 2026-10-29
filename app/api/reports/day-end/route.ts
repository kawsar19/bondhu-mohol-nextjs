import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { Expense } from '@/lib/models/expense'
import { Ingredient } from '@/lib/models/ingredient'
import { Order } from '@/lib/models/order'
import { Section } from '@/lib/models/section'
import { SectionDay } from '@/lib/models/section-day'
import { StockMovement } from '@/lib/models/stock-movement'
import { REPORT_VIEWERS } from '@/lib/permissions'
import { motherStoreStock, sectionStock } from '@/lib/stock'
import { DAY_MS, parseBusinessDate } from '@/lib/time'

const money = (n: number) => Math.round(n * 100) / 100

// Admins, managers and partners: everything about one day. ?date=YYYY-MM-DD
// Ingredient use is valued at the average purchase price up to the end of that day.
export async function GET(request: Request) {
  const { error } = await requireRole(REPORT_VIEWERS)
  if (error) return error

  const t = await getT()
  const start = parseBusinessDate(new URL(request.url).searchParams.get('date'))
  if (!start) return NextResponse.json({ error: t('dayEnd.invalidDate') }, { status: 400 })
  const end = new Date(start.getTime() + DAY_MS)

  await connectDB()
  const sold = { createdAt: { $gte: start, $lt: end }, status: { $ne: 'Cancelled' } }
  const [[totals], byPayment, bySection, [expenses], uses, days, sections, ingredients, mother, kitchens] = await Promise.all([
    Order.aggregate([{ $match: sold }, { $group: { _id: null, orders: { $sum: 1 }, sales: { $sum: '$total' }, unpaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Unpaid'] }, '$total', 0] } } } }]),
    Order.aggregate([{ $match: { ...sold, paymentStatus: 'Paid' } }, { $group: { _id: '$paymentMethod', amount: { $sum: '$total' } } }, { $sort: { amount: -1 } }]),
    // Each line goes to the section recorded when it was ordered; older orders have none, so they use the item's current section.
    Order.aggregate([
      { $match: sold },
      { $unwind: '$items' },
      { $lookup: { from: 'menuitems', localField: 'items.menuItem', foreignField: '_id', as: 'menu', pipeline: [{ $project: { section: 1 } }] } },
      { $group: { _id: { $ifNull: ['$items.section', { $first: '$menu.section' }, null] }, sales: { $sum: { $multiply: ['$items.price', '$items.qty'] } }, qty: { $sum: '$items.qty' } } },
    ]),
    Expense.aggregate([{ $match: { date: start } }, { $group: { _id: null, amount: { $sum: '$amount' }, bazar: { $sum: { $cond: [{ $ne: [{ $ifNull: ['$purchase', null] }, null] }, '$amount', 0] } } } }]),
    StockMovement.aggregate([{ $match: { type: 'use', date: start } }, { $group: { _id: { section: '$section', ingredient: '$ingredient' }, quantity: { $sum: '$quantity' } } }]),
    SectionDay.find({ date: start }),
    Section.find().sort({ sortOrder: 1, name: 1 }),
    Ingredient.find().sort({ name: 1 }),
    motherStoreStock(undefined, end),
    sectionStock(undefined, end),
  ])

  const info = new Map(ingredients.map(i => [i.id, i]))
  const avgPrice = (id: string) => {
    const s = mother.get(id)
    return s && s.bought > 0 ? s.spent / s.bought : 0
  }
  const salesOf = new Map(bySection.map(r => [r._id ? String(r._id) : null, r]))
  const dayOf = new Map(days.map(d => [String(d.section), d]))
  const stockLines = (stock: Map<string, number>) => [...stock.entries()]
    .filter(([, quantity]) => quantity !== 0)
    .map(([id, quantity]) => ({ name: info.get(id)?.name ?? '?', unit: info.get(id)?.unit ?? 'piece', quantity, value: money(Math.max(quantity, 0) * avgPrice(id)) }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const sectionRows = sections.map(s => {
    const used = uses.filter(u => String(u._id.section) === s.id).map(u => {
      const id = String(u._id.ingredient)
      return { name: info.get(id)?.name ?? '?', unit: info.get(id)?.unit ?? 'piece', quantity: u.quantity, cost: money(u.quantity * avgPrice(id)) }
    }).sort((a, b) => a.name.localeCompare(b.name))
    const day = dayOf.get(s.id)
    const sales = salesOf.get(s.id)
    return {
      _id: s.id,
      name: s.name,
      isActive: s.isActive,
      sales: sales?.sales ?? 0,
      itemsSold: sales?.qty ?? 0,
      used,
      usedCost: money(used.reduce((sum, u) => sum + u.cost, 0)),
      production: day?.production.map(p => ({ name: p.name, quantity: p.quantity })) ?? [],
      ownersShare: day?.ownersShare.map(o => ({ item: o.item, quantity: o.quantity, takenBy: o.takenBy })) ?? [],
      entered: Boolean(day),
      stock: stockLines(kitchens.get(s.id) ?? new Map()),
    }
  // Closed sections only appear on days they had something going on.
  }).filter(s => s.isActive || s.sales || s.used.length || s.entered || s.stock.length)

  const unassigned = salesOf.get(null)
  const sales = totals?.sales ?? 0
  const spent = expenses?.amount ?? 0
  return NextResponse.json({
    totals: { orders: totals?.orders ?? 0, sales, unpaid: totals?.unpaid ?? 0, expenses: spent, bazar: expenses?.bazar ?? 0, profit: sales - spent, usedCost: money(sectionRows.reduce((sum, s) => sum + s.usedCost, 0)) },
    // Orders paid before methods were recorded show as "Not recorded".
    byPayment: byPayment.map(r => ({ method: r._id || 'Not recorded', amount: r.amount })),
    sections: sectionRows,
    // Sales of menu items that aren't in any section yet.
    unassignedSales: unassigned ? { sales: unassigned.sales, itemsSold: unassigned.qty } : null,
    motherStock: stockLines(new Map([...mother.entries()].map(([id, s]) => [id, s.stock]))),
  })
}
