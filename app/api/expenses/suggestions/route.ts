import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Expense } from '@/lib/models/expense'
import { DAY_MS } from '@/lib/time'

// Admin: things bought often in the last 90 days, so the form can fill them in with one tap.
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  await connectDB()
  // Mother store purchases are entered from there, so they aren't offered here.
  const since = { date: { $gte: new Date(Date.now() - 90 * DAY_MS) }, purchase: null }
  const [items, vendors] = await Promise.all([
    Expense.aggregate([
      { $match: since },
      { $sort: { date: -1, createdAt: -1 } },
      { $group: { _id: { $toLower: '$item' }, item: { $first: '$item' }, category: { $first: '$category' }, quantity: { $first: '$quantity' }, amount: { $first: '$amount' }, paidTo: { $first: '$paidTo' }, count: { $sum: 1 } } },
      { $sort: { count: -1, item: 1 } },
      { $limit: 40 },
    ]),
    Expense.aggregate([
      { $match: { ...since, paidTo: { $ne: '' } } },
      { $group: { _id: { $toLower: '$paidTo' }, name: { $first: '$paidTo' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]),
  ])
  return NextResponse.json({
    items: items.map(i => ({ item: i.item, category: i.category, quantity: i.quantity, amount: i.amount, paidTo: i.paidTo, count: i.count })),
    vendors: vendors.map(v => v.name),
  })
}
