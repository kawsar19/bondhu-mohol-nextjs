import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Order, ORDER_STATUSES, PAYMENT_STATUSES } from '@/lib/models/order'
import { releaseTableIfIdle } from '@/lib/orders'
import { ALL_STAFF, PAYMENT_HANDLERS } from '@/lib/permissions'

type Context = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ error: 'Order not found' }, { status: 404 })

// Staff: change order status; payment status only for roles that handle money.
export async function PATCH(request: Request, { params }: Context) {
  const { session, error } = await requireRole(ALL_STAFF)
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  const body = await request.json().catch(() => null)
  const changes: Record<string, string> = {}
  if (body?.status !== undefined) {
    if (!ORDER_STATUSES.includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    changes.status = body.status
  }
  if (body?.paymentStatus !== undefined) {
    if (!PAYMENT_HANDLERS.includes(session.role)) return NextResponse.json({ error: 'Only a cashier, manager or admin can change payment' }, { status: 403 })
    if (!PAYMENT_STATUSES.includes(body.paymentStatus)) return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 })
    changes.paymentStatus = body.paymentStatus
  }
  if (Object.keys(changes).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  await connectDB()
  const order = await Order.findByIdAndUpdate(id, changes, { new: true, runValidators: true })
  if (!order) return notFound()
  if (changes.status === 'Completed' || changes.status === 'Cancelled') await releaseTableIfIdle(order.tableNumber)
  return NextResponse.json({ order })
}
