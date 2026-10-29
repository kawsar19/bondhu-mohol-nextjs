import { Types } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { parseDateRange } from '@/lib/date-range'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { Expense } from '@/lib/models/expense'
import { ExpenseCategory } from '@/lib/models/expense-category'
import { Ingredient } from '@/lib/models/ingredient'
import { StockMovement } from '@/lib/models/stock-movement'
import { STORE_KEEPERS } from '@/lib/permissions'
import { parsePurchaseInput } from '@/lib/store-input'

type Populated = { _id: Types.ObjectId; name: string; unit: string } | null

// Bazar purchases into the mother store in a date range. ?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: Request) {
  const { error } = await requireRole(STORE_KEEPERS)
  if (error) return error

  const t = await getT()
  const range = parseDateRange(new URL(request.url).searchParams, t)
  if (range.error) return NextResponse.json({ error: range.error }, { status: 400 })

  await connectDB()
  const purchases = await StockMovement.find({ type: 'purchase', date: { $gte: range.start, $lt: range.end } })
    .sort({ date: -1, createdAt: -1 })
    .limit(2000)
    .populate<{ ingredient: Populated }>('ingredient', 'name unit')
  return NextResponse.json({
    purchases: purchases.map(p => ({
      _id: p.id,
      date: p.date,
      ingredient: p.ingredient ? { _id: String(p.ingredient._id), name: p.ingredient.name, unit: p.ingredient.unit } : null,
      quantity: p.quantity,
      cost: p.cost,
      paidTo: p.paidTo,
      note: p.note,
      addedBy: p.addedBy,
    })),
  })
}

// Records a bazar purchase and the matching expense, so the money shows up in Expenses and reports.
export async function POST(request: Request) {
  const { session, error } = await requireRole(STORE_KEEPERS)
  if (error) return error

  const t = await getT()
  const parsed = parsePurchaseInput(await request.json().catch(() => null), t)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { date, ingredient: ingredientId, quantity, cost, category, paidTo, note } = parsed.data

  await connectDB()
  const [ingredient, categoryExists] = await Promise.all([Ingredient.findById(ingredientId), ExpenseCategory.exists({ name: category })])
  if (!ingredient || !ingredient.isActive) return NextResponse.json({ error: t('store.api.ingredientGone') }, { status: 400 })
  if (!categoryExists) return NextResponse.json({ error: t('expenses.errors.categoryGone') }, { status: 400 })

  // Without a replica set there are no transactions, so the expense is undone by hand if the movement fails.
  const purchaseId = new Types.ObjectId()
  const expense = await Expense.create({
    date,
    category,
    item: ingredient.name,
    quantity: `${quantity} ${t(`ingredients.units.${ingredient.unit}`)}`,
    amount: cost,
    paidTo,
    note,
    addedBy: session.name,
    purchase: purchaseId,
  })
  try {
    await StockMovement.create({ _id: purchaseId, date, type: 'purchase', ingredient: ingredient._id, section: null, quantity, cost, expense: expense._id, paidTo, note, addedBy: session.name })
  } catch (err) {
    await Expense.deleteOne({ _id: expense._id })
    throw err
  }
  return NextResponse.json({ ok: true }, { status: 201 })
}
