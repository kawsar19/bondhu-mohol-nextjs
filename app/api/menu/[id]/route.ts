import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { parseMenuInput } from '@/lib/menu-input'
import { MenuItem } from '@/lib/models/menu-item'
import { Section } from '@/lib/models/section'

type Context = { params: Promise<{ id: string }> }

const notFound = async () => NextResponse.json({ error: (await getT())('menu.api.notFound') }, { status: 404 })

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

  const t = await getT()
  const parsed = parseMenuInput(await request.json().catch(() => null), t, true)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  if (parsed.data.section && !(await Section.exists({ _id: parsed.data.section }))) return NextResponse.json({ error: t('menu.api.sectionInvalid') }, { status: 400 })
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
