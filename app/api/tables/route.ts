import { NextResponse } from 'next/server'
import { requireAdmin, requireRole } from '@/lib/auth'
import { MANAGERS } from '@/lib/permissions'
import { connectDB } from '@/lib/db'
import { Table } from '@/lib/models/table'
import { getT } from '@/lib/i18n/server'
import { isDuplicateKeyError, parseTableInput } from '@/lib/table-input'

// Also read by the order entry screen.
export async function GET() {
  const { error } = await requireRole(MANAGERS)
  if (error) return error

  await connectDB()
  const tables = await Table.find().sort({ number: 1 })
  return NextResponse.json({ tables })
}

export async function POST(request: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const t = await getT()
  const parsed = parseTableInput(await request.json().catch(() => null), t)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  try {
    const table = await Table.create(parsed.data)
    return NextResponse.json({ table }, { status: 201 })
  } catch (err) {
    if (isDuplicateKeyError(err)) return NextResponse.json({ error: t('tables.api.exists', { number: parsed.data.number ?? '' }) }, { status: 409 })
    throw err
  }
}
