import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Order, ORDER_STATUSES } from '@/lib/models/order'
import { createOrder, OrderInputError } from '@/lib/orders'
import { startOfBusinessDay } from '@/lib/time'

// Public: customers place orders from the menu page.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  await connectDB()
  try {
    const order = await createOrder(body)
    return NextResponse.json({ order }, { status: 201 })
  } catch (err) {
    if (err instanceof OrderInputError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
}

// Admin: list orders, newest first. ?status=Pending&day=today
export async function GET(request: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const params = new URL(request.url).searchParams
  const filter: Record<string, unknown> = {}
  const status = params.get('status')
  if (status && ORDER_STATUSES.includes(status as never)) filter.status = status
  if (params.get('day') === 'today') filter.createdAt = { $gte: startOfBusinessDay() }

  await connectDB()
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200)
  return NextResponse.json({ orders })
}
