import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { Expense } from '@/lib/models/expense'
import { StockMovement } from '@/lib/models/stock-movement'
import { STORE_KEEPERS } from '@/lib/permissions'
import { motherStoreStock } from '@/lib/stock'

type Context = { params: Promise<{ id: string }> }

const notFound = async () => NextResponse.json({ error: (await getT())('store.api.notFound') }, { status: 404 })

// Undoes a wrong purchase entry together with its expense. A mistake is fixed by deleting and entering it again.
export async function DELETE(_request: Request, { params }: Context) {
  const { error } = await requireRole(STORE_KEEPERS)
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  await connectDB()
  const purchase = await StockMovement.findOne({ _id: id, type: 'purchase' })
  if (!purchase) return notFound()

  // Refuse if some of it has already been sent on, or the mother store would go below zero.
  const stock = (await motherStoreStock(purchase.ingredient)).get(String(purchase.ingredient))?.stock ?? 0
  if (stock - purchase.quantity < -0.0005) return NextResponse.json({ error: (await getT())('store.api.alreadyUsed') }, { status: 409 })

  await Promise.all([StockMovement.deleteOne({ _id: purchase._id }), Expense.deleteOne({ purchase: purchase._id })])
  return NextResponse.json({ ok: true })
}
