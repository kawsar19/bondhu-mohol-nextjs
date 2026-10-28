import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import type { TFunction } from '@/lib/i18n'
import { getT } from '@/lib/i18n/server'
import { Order, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '@/lib/models/order'
import { OrderInputError, orderTotal, priceItems } from '@/lib/orders'
import { MANAGERS } from '@/lib/permissions'

type Context = { params: Promise<{ id: string }> }

const notFound = (t: TFunction) => NextResponse.json({ error: t('orders.api.notFound') }, { status: 404 })
const badRequest = (error: string, status = 400) => NextResponse.json({ error }, { status })

// Manager: cancel or restore an order, change its payment, or fix its items.
export async function PATCH(request: Request, { params }: Context) {
  const { error } = await requireRole(MANAGERS)
  if (error) return error
  const t = await getT()
  const { id } = await params
  if (!isValidObjectId(id)) return notFound(t)

  const body = await request.json().catch(() => null)
  const changes: Record<string, unknown> = {}
  const unset: Record<string, 1> = {}
  if (body?.status !== undefined) {
    if (!ORDER_STATUSES.includes(body.status)) return badRequest(t('orders.api.invalidStatus'))
    changes.status = body.status
  }
  if (body?.paymentStatus !== undefined) {
    if (!PAYMENT_STATUSES.includes(body.paymentStatus)) return badRequest(t('orders.api.invalidPaymentStatus'))
    changes.paymentStatus = body.paymentStatus
    if (body.paymentStatus === 'Paid') {
      if (!PAYMENT_METHODS.includes(body.paymentMethod)) return badRequest(t('billing.api.chooseMethod'))
      changes.paymentMethod = body.paymentMethod
      changes.paidAt = new Date()
    } else {
      changes.paymentMethod = ''
      unset.paidAt = 1
    }
  }
  const editingItems = body?.items !== undefined
  if (Object.keys(changes).length === 0 && !editingItems) return badRequest(t('orders.api.nothingToUpdate'))

  await connectDB()
  if (editingItems) {
    const current = await Order.findById(id)
    if (!current) return notFound(t)
    if (current.status === 'Cancelled') return badRequest(t('orders.api.itemsLocked'))
    if (current.paymentStatus === 'Paid' && changes.paymentStatus !== 'Unpaid') return badRequest(t('orders.api.alreadyPaid'))
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
  return order ? NextResponse.json({ order }) : notFound(t)
}
