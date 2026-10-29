import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { parseSectionInput } from '@/lib/kitchen-input'
import { MenuItem } from '@/lib/models/menu-item'
import { Section } from '@/lib/models/section'
import { StockMovement } from '@/lib/models/stock-movement'
import { isDuplicateKeyError } from '@/lib/table-input'

type Context = { params: Promise<{ id: string }> }

const notFound = async () => NextResponse.json({ error: (await getT())('sections.api.notFound') }, { status: 404 })

export async function PATCH(request: Request, { params }: Context) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  const t = await getT()
  const parsed = parseSectionInput(await request.json().catch(() => null), t, true)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  const section = await Section.findById(id)
  if (!section) return notFound()
  section.set(parsed.data)
  try {
    await section.save()
  } catch (err) {
    if (isDuplicateKeyError(err)) return NextResponse.json({ error: t('sections.api.exists', { name: parsed.data.name ?? '' }) }, { status: 409 })
    throw err
  }
  const itemCount = await MenuItem.countDocuments({ section: section._id })
  return NextResponse.json({ section: { _id: section.id, name: section.name, sortOrder: section.sortOrder, isActive: section.isActive, itemCount } })
}

export async function DELETE(_request: Request, { params }: Context) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  await connectDB()
  const section = await Section.findById(id)
  if (!section) return notFound()
  // Menu items point at the section, so it can only be closed while any use it.
  const used = await MenuItem.countDocuments({ section: section._id })
  if (used > 0) return NextResponse.json({ error: (await getT())(used === 1 ? 'sections.api.inUseOne' : 'sections.api.inUseMany', { count: used, name: section.name }) }, { status: 409 })
  if (await StockMovement.exists({ section: section._id })) return NextResponse.json({ error: (await getT())('sections.api.hasStock', { name: section.name }) }, { status: 409 })
  await section.deleteOne()
  return NextResponse.json({ ok: true })
}
