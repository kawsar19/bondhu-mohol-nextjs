import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { MANAGERS } from '@/lib/permissions'
import { connectDB } from '@/lib/db'
import { Order, ORDER_STATUSES } from '@/lib/models/order'
import { createOrder, OrderInputError } from '@/lib/orders'
import { startOfBusinessDay } from '@/lib/time'

// Manager: enter an order.
export async function POST(request: Request) {
  const { session, error } = await requireRole(MANAGERS)
  if (error) return error

  const body = await request.json().catch(() => null)
  await connectDB()
  try {
    const order = await createOrder(body, { name: session.name })
    return NextResponse.json({ order }, { status: 201 })
  } catch (err) {
    if (err instanceof OrderInputError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
}

// Manager: list orders, newest first. ?status=Cancelled&day=today
export async function GET(request: Request) {
  const { error } = await requireRole(MANAGERS)
  if (error) return error

  const params = new URL(request.url).searchParams
  const filter: Record<string, unknown> = {}
  const statuses = (params.get('status') ?? '').split(',').filter(s => ORDER_STATUSES.includes(s as never))
  if (statuses.length) filter.status = { $in: statuses }
  if (params.get('day') === 'today') filter.createdAt = { $gte: startOfBusinessDay() }

  await connectDB()
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200)
  return NextResponse.json({ orders })
}
