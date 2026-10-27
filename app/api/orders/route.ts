import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { ALL_STAFF } from '@/lib/permissions'
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

// Staff: list orders, newest first. ?status=Pending,Preparing&day=today
export async function GET(request: Request) {
  const { error } = await requireRole(ALL_STAFF)
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
