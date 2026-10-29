import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { StockMovement } from '@/lib/models/stock-movement'
import { STORE_KEEPERS } from '@/lib/permissions'
import { motherStoreStock } from '@/lib/stock'

type Context = { params: Promise<{ id: string }> }

const notFound = async () => NextResponse.json({ error: (await getT())('store.api.countNotFound') }, { status: 404 })

// Undoes one correction from a wrong count.
export async function DELETE(_request: Request, { params }: Context) {
  const { error } = await requireRole(STORE_KEEPERS)
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  await connectDB()
  const count = await StockMovement.findOne({ _id: id, type: 'adjust', section: null, sectionDay: null })
  if (!count) return notFound()

  // Undoing a count that added stock takes it away again, which mustn't leave the store below zero.
  const stock = (await motherStoreStock(count.ingredient)).get(String(count.ingredient))?.stock ?? 0
  if (stock - count.quantity < -0.0005) return NextResponse.json({ error: (await getT())('store.api.alreadyUsed') }, { status: 409 })

  await StockMovement.deleteOne({ _id: count._id })
  return NextResponse.json({ ok: true })
}
