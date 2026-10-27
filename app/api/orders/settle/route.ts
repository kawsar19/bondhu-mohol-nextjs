import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { Order, PAYMENT_METHODS } from '@/lib/models/order'
import { releaseTableIfIdle } from '@/lib/orders'
import { PAYMENT_HANDLERS } from '@/lib/permissions'

// Cashier: one payment for several orders, e.g. everything a table ordered.
// Orders already served (or ready) are completed too, which frees the table.
export async function POST(request: Request) {
  const { error } = await requireRole(PAYMENT_HANDLERS)
  if (error) return error

  const t = await getT()
  const body = await request.json().catch(() => null)
  const ids: unknown = body?.orderIds
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50 || !ids.every(id => typeof id === 'string' && isValidObjectId(id))) return NextResponse.json({ error: t('billing.api.chooseOrders') }, { status: 400 })
  if (!PAYMENT_METHODS.includes(body?.paymentMethod)) return NextResponse.json({ error: t('billing.api.chooseMethod') }, { status: 400 })

  await connectDB()
  const orders = await Order.find({ _id: { $in: ids } })
  if (orders.length !== new Set(ids).size) return NextResponse.json({ error: t('billing.api.ordersGone') }, { status: 404 })
  const blocked = orders.find(o => o.status === 'Cancelled' || o.paymentStatus === 'Paid')
  if (blocked) return NextResponse.json({ error: t(blocked.status === 'Cancelled' ? 'billing.api.alreadyCancelled' : 'billing.api.alreadyPaid', { code: blocked.code }) }, { status: 409 })

  const paidAt = new Date()
  await Order.updateMany({ _id: { $in: ids } }, { $set: { paymentStatus: 'Paid', paymentMethod: body.paymentMethod, paidAt } })
  if (body?.complete !== false) await Order.updateMany({ _id: { $in: ids }, status: { $in: ['Ready', 'Served'] } }, { $set: { status: 'Completed' } })
  for (const table of new Set(orders.map(o => o.tableNumber))) await releaseTableIfIdle(table)

  return NextResponse.json({ orders: await Order.find({ _id: { $in: ids } }) })
}
