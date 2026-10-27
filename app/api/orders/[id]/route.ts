import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { OPEN_STATUSES, Order, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '@/lib/models/order'
import { OrderInputError, orderTotal, priceItems, releaseTableIfIdle } from '@/lib/orders'
import { ALL_STAFF, ORDER_TAKERS, PAYMENT_HANDLERS } from '@/lib/permissions'

type Context = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ error: 'Order not found' }, { status: 404 })
const badRequest = (error: string, status = 400) => NextResponse.json({ error }, { status })

// Staff: change status, payment, or the items on an open order. Each part has its own roles.
export async function PATCH(request: Request, { params }: Context) {
  const { session, error } = await requireRole(ALL_STAFF)
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  const body = await request.json().catch(() => null)
  const changes: Record<string, unknown> = {}
  const unset: Record<string, 1> = {}
  if (body?.status !== undefined) {
    if (!ORDER_STATUSES.includes(body.status)) return badRequest('Invalid status')
    changes.status = body.status
  }
  if (body?.paymentStatus !== undefined) {
    if (!PAYMENT_HANDLERS.includes(session.role)) return badRequest('Only a cashier, manager or admin can change payment', 403)
    if (!PAYMENT_STATUSES.includes(body.paymentStatus)) return badRequest('Invalid payment status')
    changes.paymentStatus = body.paymentStatus
    if (body.paymentStatus === 'Paid') {
      if (!PAYMENT_METHODS.includes(body.paymentMethod)) return badRequest('Choose how it was paid: Cash, bKash, Nagad or Card')
      changes.paymentMethod = body.paymentMethod
      changes.paidAt = new Date()
    } else {
      changes.paymentMethod = ''
      unset.paidAt = 1
    }
  }
  const editingItems = body?.items !== undefined
  if (editingItems && !ORDER_TAKERS.includes(session.role)) return badRequest('Your role can\'t change order items', 403)
  if (Object.keys(changes).length === 0 && !editingItems) return badRequest('Nothing to update')

  await connectDB()
  if (editingItems) {
    const current = await Order.findById(id)
    if (!current) return notFound()
    if (!OPEN_STATUSES.includes(current.status as never)) return badRequest(`This order is ${current.status.toLowerCase()}, so its items can't be changed`)
    if (current.paymentStatus === 'Paid' && changes.paymentStatus !== 'Unpaid') return badRequest('This order is already paid. Mark it unpaid first to change items.')
    try {
      const items = await priceItems(body.items, current.items)
      changes.items = items
      changes.total = orderTotal(items)
    } catch (err) {
      if (err instanceof OrderInputError) return badRequest(err.message)
      throw err
    }
  }

  const order = await Order.findByIdAndUpdate(id, { $set: changes, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { new: true, runValidators: true })
  if (!order) return notFound()
  if (changes.status === 'Completed' || changes.status === 'Cancelled') await releaseTableIfIdle(order.tableNumber)
  return NextResponse.json({ order })
}
