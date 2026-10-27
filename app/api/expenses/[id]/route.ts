import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { parseExpenseInput } from '@/lib/expense-input'
import { getT } from '@/lib/i18n/server'
import { Expense } from '@/lib/models/expense'
import { ExpenseCategory } from '@/lib/models/expense-category'

type Context = { params: Promise<{ id: string }> }

const notFound = async () => NextResponse.json({ error: (await getT())('expenses.errors.notFound') }, { status: 404 })

export async function PATCH(request: Request, { params }: Context) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  const t = await getT()
  const parsed = parseExpenseInput(await request.json().catch(() => null), t, true)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  if (parsed.data.category && !(await ExpenseCategory.exists({ name: parsed.data.category }))) return NextResponse.json({ error: t('expenses.errors.categoryGone') }, { status: 400 })
  const expense = await Expense.findByIdAndUpdate(id, parsed.data, { new: true, runValidators: true })
  return expense ? NextResponse.json({ expense }) : notFound()
}

export async function DELETE(_request: Request, { params }: Context) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  await connectDB()
  const expense = await Expense.findByIdAndDelete(id)
  return expense ? NextResponse.json({ ok: true }) : notFound()
}
