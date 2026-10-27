import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Expense } from '@/lib/models/expense'
import { ExpenseCategory, listExpenseCategories } from '@/lib/models/expense-category'
import { isDuplicateKeyError } from '@/lib/table-input'
import { parseCategoryInput } from '@/lib/expense-input'
import { getT } from '@/lib/i18n/server'

// Admin: expense categories, with how many entries use each one.
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  await connectDB()
  const [categories, counts] = await Promise.all([listExpenseCategories(), Expense.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }])])
  const countOf = new Map(counts.map(c => [c._id, c.count]))
  return NextResponse.json({ categories: categories.map(c => ({ _id: c.id, name: c.name, hint: c.hint, isHidden: c.isHidden, count: countOf.get(c.name) ?? 0 })) })
}

export async function POST(request: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const t = await getT()
  const parsed = parseCategoryInput(await request.json().catch(() => null), t)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  try {
    const last = await ExpenseCategory.findOne().sort({ sortOrder: -1 }).select('sortOrder')
    const category = await ExpenseCategory.create({ ...parsed.data, sortOrder: (last?.sortOrder ?? 0) + 1 })
    return NextResponse.json({ category: { _id: category.id, name: category.name, hint: category.hint, isHidden: category.isHidden, count: 0 } }, { status: 201 })
  } catch (err) {
    if (isDuplicateKeyError(err)) return NextResponse.json({ error: t('expenses.errors.categoryExists', { name: parsed.data.name ?? '' }) }, { status: 409 })
    throw err
  }
}
