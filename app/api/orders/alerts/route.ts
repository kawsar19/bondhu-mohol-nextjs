import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { ALL_STAFF } from '@/lib/permissions'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/order'

// Staff: orders created after `since`, polled by the dashboard to ring for new orders.
// Without a valid `since` it only returns the server time to start from.
export async function GET(request: Request) {
  const { error } = await requireRole(ALL_STAFF)
  if (error) return error

  const now = new Date()
  const since = new Date(new URL(request.url).searchParams.get('since') ?? '')
  if (Number.isNaN(since.getTime())) return NextResponse.json({ now, orders: [] })

  await connectDB()
  const orders = await Order.find({ createdAt: { $gt: since, $lte: now } })
    .sort({ createdAt: 1 })
    .limit(20)
    .select('code type tableNumber customerName total source takenBy createdAt')
    .lean()

  return NextResponse.json({
    now,
    orders: orders.map(o => ({ id: o._id.toString(), code: o.code, type: o.type, tableNumber: o.tableNumber ?? null, customerName: o.customerName ?? '', total: o.total, source: o.source ?? 'Customer', takenBy: o.takenBy ?? '' })),
  })
}
