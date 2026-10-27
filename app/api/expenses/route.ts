import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { parseDateRange } from '@/lib/date-range'
import { connectDB } from '@/lib/db'
import { parseExpenseInput } from '@/lib/expense-input'
import { getT } from '@/lib/i18n/server'
import { Expense } from '@/lib/models/expense'
import { ExpenseCategory } from '@/lib/models/expense-category'

// Admin: purchases and other spending in a date range. ?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const t = await getT()
  const range = parseDateRange(new URL(request.url).searchParams, t)
  if (range.error) return NextResponse.json({ error: range.error }, { status: 400 })

  await connectDB()
  const expenses = await Expense.find({ date: { $gte: range.start, $lt: range.end } }).sort({ date: -1, createdAt: -1 }).limit(2000)
  return NextResponse.json({ expenses })
}

export async function POST(request: Request) {
  const { session, error } = await requireAdmin()
  if (error) return error

  const t = await getT()
  const parsed = parseExpenseInput(await request.json().catch(() => null), t)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  if (parsed.data.category && !(await ExpenseCategory.exists({ name: parsed.data.category }))) return NextResponse.json({ error: t('expenses.errors.categoryGone') }, { status: 400 })
  const expense = await Expense.create({ ...parsed.data, addedBy: session.name })
  return NextResponse.json({ expense }, { status: 201 })
}
