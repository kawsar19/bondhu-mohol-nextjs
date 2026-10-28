import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { parseDateRange } from '@/lib/date-range'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { Expense } from '@/lib/models/expense'
import { Order } from '@/lib/models/order'
import { REPORT_VIEWERS } from '@/lib/permissions'

const TZ = 'Asia/Dhaka'
const byDay = (field: string) => ({ $dateToString: { format: '%Y-%m-%d', date: field, timezone: TZ } })

// Admins, managers and partners: sales, spending and profit for ?from=YYYY-MM-DD&to=YYYY-MM-DD (Bangladesh dates, inclusive).
// Sales count every order that wasn't cancelled, paid or not; unpaid is shown separately.
export async function GET(request: Request) {
  const { error } = await requireRole(REPORT_VIEWERS)
  if (error) return error

  const t = await getT()
  const range = parseDateRange(new URL(request.url).searchParams, t)
  if (range.error) return NextResponse.json({ error: range.error }, { status: 400 })

  await connectDB()
  const inRange = { createdAt: { $gte: range.start, $lt: range.end } }
  const sold = { ...inRange, status: { $ne: 'Cancelled' } }

  const [[totals], cancelled, byType, byPayment, salesByDay, topItems, expensesByDay, expensesByCategory] = await Promise.all([
    Order.aggregate([
      { $match: sold },
      { $group: { _id: null, orders: { $sum: 1 }, sales: { $sum: '$total' }, unpaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Unpaid'] }, '$total', 0] } } } },
    ]),
    Order.countDocuments({ ...inRange, status: 'Cancelled' }),
    Order.aggregate([{ $match: sold }, { $group: { _id: '$type', orders: { $sum: 1 }, sales: { $sum: '$total' } } }]),
    Order.aggregate([{ $match: { ...sold, paymentStatus: 'Paid' } }, { $group: { _id: '$paymentMethod', orders: { $sum: 1 }, amount: { $sum: '$total' } } }, { $sort: { amount: -1 } }]),
    Order.aggregate([{ $match: sold }, { $group: { _id: byDay('$createdAt'), orders: { $sum: 1 }, sales: { $sum: '$total' } } }]),
    Order.aggregate([
      { $match: sold },
      { $unwind: '$items' },
      { $group: { _id: '$items.menuItem', name: { $last: '$items.name' }, qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
      { $sort: { revenue: -1, qty: -1 } },
      { $limit: 10 },
    ]),
    Expense.aggregate([{ $match: { date: { $gte: range.start, $lt: range.end } } }, { $group: { _id: byDay('$date'), amount: { $sum: '$amount' } } }]),
    Expense.aggregate([
      { $match: { date: { $gte: range.start, $lt: range.end } } },
      { $group: { _id: '$category', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } },
    ]),
  ])

  // One row per day that had sales or spending, newest first.
  const days = new Map<string, { date: string; orders: number; sales: number; expenses: number }>()
  const day = (date: string) => days.get(date) ?? days.set(date, { date, orders: 0, sales: 0, expenses: 0 }).get(date)!
  for (const row of salesByDay) Object.assign(day(row._id), { orders: row.orders, sales: row.sales })
  for (const row of expensesByDay) day(row._id).expenses = row.amount

  const sales = totals?.sales ?? 0
  const expenses = expensesByCategory.reduce((sum, row) => sum + row.amount, 0)

  return NextResponse.json({
    totals: { orders: totals?.orders ?? 0, sales, unpaid: totals?.unpaid ?? 0, cancelled, expenses, profit: sales - expenses },
    byType: byType.map(row => ({ type: row._id, orders: row.orders, sales: row.sales })),
    // Orders paid before methods were recorded show as "Not recorded".
    byPayment: byPayment.map(row => ({ method: row._id || 'Not recorded', orders: row.orders, amount: row.amount })),
    daily: [...days.values()].sort((a, b) => b.date.localeCompare(a.date)).map(d => ({ ...d, profit: d.sales - d.expenses })),
    topItems: topItems.map(row => ({ id: String(row._id), name: row.name, qty: row.qty, revenue: row.revenue })),
    expensesByCategory: expensesByCategory.map(row => ({ category: row._id, amount: row.amount, count: row.count })),
  })
}
