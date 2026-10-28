import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Expense } from '@/lib/models/expense'
import { Order } from '@/lib/models/order'
import { REPORT_VIEWERS } from '@/lib/permissions'
import { DAY_MS, startOfBusinessDay } from '@/lib/time'

type Totals = { orders: number; sales: number; unpaid: number }

const notCancelled = { status: { $ne: 'Cancelled' } }

async function totalsBetween(from: Date, to: Date): Promise<Totals> {
  const [row] = await Order.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to }, ...notCancelled } },
    { $group: { _id: null, orders: { $sum: 1 }, sales: { $sum: '$total' }, unpaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Unpaid'] }, '$total', 0] } } } },
  ])
  return { orders: row?.orders ?? 0, sales: row?.sales ?? 0, unpaid: row?.unpaid ?? 0 }
}

// Admins, managers and partners: live numbers for the dashboard overview.
export async function GET() {
  const { error } = await requireRole(REPORT_VIEWERS)
  if (error) return error

  await connectDB()
  const now = new Date()
  const today = startOfBusinessDay(now)
  const weekStart = new Date(today.getTime() - 6 * DAY_MS)

  const [todayTotals, yesterdayTotals, [spent], recent, popular] = await Promise.all([
    totalsBetween(today, now),
    // Compare with yesterday up to the same time of day, so mornings aren't measured against a full day.
    totalsBetween(new Date(today.getTime() - DAY_MS), new Date(now.getTime() - DAY_MS)),
    // Expenses are dated by day, not time, so today's are everything dated today.
    Expense.aggregate([{ $match: { date: today } }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Order.find().sort({ createdAt: -1 }).limit(6).select('code type tableNumber customerName items total status takenBy createdAt').lean(),
    Order.aggregate([
      { $match: { createdAt: { $gte: weekStart }, ...notCancelled } },
      { $unwind: '$items' },
      { $group: { _id: '$items.menuItem', name: { $first: '$items.name' }, qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
      { $sort: { qty: -1, revenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'menuitems', localField: '_id', foreignField: '_id', as: 'menu' } },
    ]),
  ])

  return NextResponse.json({
    today: todayTotals,
    yesterday: yesterdayTotals,
    expenses: { amount: spent?.amount ?? 0, count: spent?.count ?? 0 },
    recent: recent.map(o => ({ id: o._id.toString(), code: o.code, type: o.type, tableNumber: o.tableNumber ?? null, customerName: o.customerName ?? '', items: o.items.map(i => `${i.qty}× ${i.name}`).join(', '), total: o.total, status: o.status, takenBy: o.takenBy ?? '', createdAt: o.createdAt })),
    popular: popular.map(p => ({ id: String(p._id), name: p.menu[0]?.name ?? p.name, image: p.menu[0]?.image ?? '', qty: p.qty, revenue: p.revenue })),
    updatedAt: now,
  })
}
