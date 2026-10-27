import { NextResponse } from 'next/server'
import { requireAdmin, requireRole } from '@/lib/auth'
import { ORDER_TAKERS } from '@/lib/permissions'
import { connectDB } from '@/lib/db'
import { Table } from '@/lib/models/table'
import { isDuplicateKeyError, parseTableInput } from '@/lib/table-input'

// Also read by the waiter panel.
export async function GET() {
  const { error } = await requireRole(ORDER_TAKERS)
  if (error) return error

  await connectDB()
  const tables = await Table.find().sort({ number: 1 })
  return NextResponse.json({ tables })
}

export async function POST(request: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const parsed = parseTableInput(await request.json().catch(() => null))
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  try {
    const table = await Table.create(parsed.data)
    return NextResponse.json({ table }, { status: 201 })
  } catch (err) {
    if (isDuplicateKeyError(err)) return NextResponse.json({ error: `Table ${parsed.data.number} already exists` }, { status: 409 })
    throw err
  }
}
