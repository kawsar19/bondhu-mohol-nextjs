import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { parseMenuInput } from '@/lib/menu-input'
import { MenuItem } from '@/lib/models/menu-item'

type Context = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ error: 'Menu item not found' }, { status: 404 })

export async function GET(_request: Request, { params }: Context) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  await connectDB()
  const item = await MenuItem.findById(id)
  return item ? NextResponse.json({ item }) : notFound()
}

export async function PATCH(request: Request, { params }: Context) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  const parsed = parseMenuInput(await request.json().catch(() => null), true)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  const item = await MenuItem.findByIdAndUpdate(id, parsed.data, { new: true, runValidators: true })
  return item ? NextResponse.json({ item }) : notFound()
}

export async function DELETE(_request: Request, { params }: Context) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  await connectDB()
  const item = await MenuItem.findByIdAndDelete(id)
  return item ? NextResponse.json({ ok: true }) : notFound()
}
