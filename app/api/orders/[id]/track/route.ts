import { timingSafeEqual } from 'node:crypto'
import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/order'

type Context = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ error: 'Order not found' }, { status: 404 })

// Public: the customer who placed the order can follow its status with their tracking token.
export async function GET(request: Request, { params }: Context) {
  const { id } = await params
  const token = new URL(request.url).searchParams.get('token') ?? ''
  if (!isValidObjectId(id) || !/^[a-f0-9]{32}$/.test(token)) return notFound()

  await connectDB()
  const order = await Order.findById(id).select('+trackingToken').lean()
  if (!order || !timingSafeEqual(Buffer.from(order.trackingToken), Buffer.from(token))) return notFound()

  return NextResponse.json({
    order: { id: order._id.toString(), code: order.code, type: order.type, tableNumber: order.tableNumber ?? null, items: order.items.map(i => ({ name: i.name, price: i.price, qty: i.qty })), total: order.total, status: order.status, createdAt: order.createdAt },
  })
}
