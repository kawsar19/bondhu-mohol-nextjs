import { NextResponse } from 'next/server'
import { requireAdmin, requireRole } from '@/lib/auth'
import { ORDER_TAKERS } from '@/lib/permissions'
import { connectDB } from '@/lib/db'
import { parseMenuInput } from '@/lib/menu-input'
import { MenuItem } from '@/lib/models/menu-item'

// Also read by the waiter panel.
export async function GET() {
  const { error } = await requireRole(ORDER_TAKERS)
  if (error) return error

  await connectDB()
  const items = await MenuItem.find().sort({ category: 1, name: 1 })
  return NextResponse.json({ items })
}

export async function POST(request: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const parsed = parseMenuInput(await request.json().catch(() => null))
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  const item = await MenuItem.create(parsed.data)
  return NextResponse.json({ item }, { status: 201 })
}
