import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { ORDER_TAKERS } from '@/lib/permissions'
import { connectDB } from '@/lib/db'
import { createOrder, OrderInputError } from '@/lib/orders'

// Staff: a waiter places an order on a guest's behalf.
export async function POST(request: Request) {
  const { session, error } = await requireRole(ORDER_TAKERS)
  if (error) return error

  const body = await request.json().catch(() => null)
  await connectDB()
  try {
    const order = await createOrder(body, { name: session.name })
    return NextResponse.json({ order: { id: order.id, code: order.code } }, { status: 201 })
  } catch (err) {
    if (err instanceof OrderInputError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
}
