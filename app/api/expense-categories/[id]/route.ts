import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { parseCategoryInput } from '@/lib/expense-input'
import { getT } from '@/lib/i18n/server'
import { Expense } from '@/lib/models/expense'
import { ExpenseCategory } from '@/lib/models/expense-category'
import { isDuplicateKeyError } from '@/lib/table-input'

type Context = { params: Promise<{ id: string }> }

const notFound = async () => NextResponse.json({ error: (await getT())('expenses.errors.categoryNotFound') }, { status: 404 })

export async function PATCH(request: Request, { params }: Context) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  const t = await getT()
  const parsed = parseCategoryInput(await request.json().catch(() => null), t, true)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  const category = await ExpenseCategory.findById(id)
  if (!category) return notFound()
  const oldName = category.name
  category.set(parsed.data)
  try {
    await category.save()
  } catch (err) {
    if (isDuplicateKeyError(err)) return NextResponse.json({ error: t('expenses.errors.categoryExists', { name: parsed.data.name ?? '' }) }, { status: 409 })
    throw err
  }
  // Entries store the name, so a rename carries over to them.
  if (category.name !== oldName) await Expense.updateMany({ category: oldName }, { category: category.name })
  const count = await Expense.countDocuments({ category: category.name })
  return NextResponse.json({ category: { _id: category.id, name: category.name, hint: category.hint, isHidden: category.isHidden, count } })
}

export async function DELETE(_request: Request, { params }: Context) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  await connectDB()
  const category = await ExpenseCategory.findById(id)
  if (!category) return notFound()
  const used = await Expense.countDocuments({ category: category.name })
  if (used > 0) return NextResponse.json({ error: (await getT())(used === 1 ? 'expenses.errors.categoryInUseOne' : 'expenses.errors.categoryInUseMany', { count: used, name: category.name }) }, { status: 409 })
  await category.deleteOne()
  return NextResponse.json({ ok: true })
}
