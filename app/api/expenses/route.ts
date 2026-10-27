import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { parseDateRange } from '@/lib/date-range'
import { connectDB } from '@/lib/db'
import { parseExpenseInput } from '@/lib/expense-input'
import { Expense } from '@/lib/models/expense'
import { ExpenseCategory } from '@/lib/models/expense-category'

// Admin: purchases and other spending in a date range. ?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const range = parseDateRange(new URL(request.url).searchParams)
  if (range.error) return NextResponse.json({ error: range.error }, { status: 400 })

  await connectDB()
  const expenses = await Expense.find({ date: { $gte: range.start, $lt: range.end } }).sort({ date: -1, createdAt: -1 }).limit(2000)
  return NextResponse.json({ expenses })
}

export async function POST(request: Request) {
  const { session, error } = await requireAdmin()
  if (error) return error

  const parsed = parseExpenseInput(await request.json().catch(() => null))
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  if (parsed.data.category && !(await ExpenseCategory.exists({ name: parsed.data.category }))) return NextResponse.json({ error: 'That category no longer exists' }, { status: 400 })
  const expense = await Expense.create({ ...parsed.data, addedBy: session.name })
  return NextResponse.json({ expense }, { status: 201 })
}
