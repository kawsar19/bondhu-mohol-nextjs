import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { StockMovement } from '@/lib/models/stock-movement'
import { STORE_KEEPERS } from '@/lib/permissions'
import { sectionStock } from '@/lib/stock'

type Context = { params: Promise<{ id: string }> }

const notFound = async () => NextResponse.json({ error: (await getT())('store.api.transferNotFound') }, { status: 404 })

// Undoes one wrongly sent item, which puts it back in the mother store.
export async function DELETE(_request: Request, { params }: Context) {
  const { error } = await requireRole(STORE_KEEPERS)
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  await connectDB()
  const transfer = await StockMovement.findOne({ _id: id, type: 'transfer' })
  if (!transfer || !transfer.section) return notFound()

  // Refuse if the section has already used some of it, or its stock would go below zero.
  const stock = (await sectionStock({ section: transfer.section, ingredient: transfer.ingredient })).get(String(transfer.section))?.get(String(transfer.ingredient)) ?? 0
  if (stock - transfer.quantity < -0.0005) return NextResponse.json({ error: (await getT())('store.api.alreadyUsedInSection') }, { status: 409 })

  await StockMovement.deleteOne({ _id: transfer._id })
  return NextResponse.json({ ok: true })
}
