import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { parseSectionInput } from '@/lib/kitchen-input'
import { MenuItem } from '@/lib/models/menu-item'
import { Section } from '@/lib/models/section'
import { isDuplicateKeyError } from '@/lib/table-input'

// Kitchen sections in display order, with how many menu items each one sells.
// Also read by the menu screen for its section picker.
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  await connectDB()
  const [sections, counts] = await Promise.all([
    Section.find().sort({ sortOrder: 1, name: 1 }),
    MenuItem.aggregate([{ $match: { section: { $ne: null } } }, { $group: { _id: '$section', count: { $sum: 1 } } }]),
  ])
  const countOf = new Map(counts.map(c => [String(c._id), c.count]))
  return NextResponse.json({ sections: sections.map(s => ({ _id: s.id, name: s.name, sortOrder: s.sortOrder, isActive: s.isActive, itemCount: countOf.get(s.id) ?? 0 })) })
}

export async function POST(request: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const t = await getT()
  const parsed = parseSectionInput(await request.json().catch(() => null), t)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  try {
    const last = await Section.findOne().sort({ sortOrder: -1 }).select('sortOrder')
    const section = await Section.create({ ...parsed.data, sortOrder: (last?.sortOrder ?? 0) + 1 })
    return NextResponse.json({ section: { _id: section.id, name: section.name, sortOrder: section.sortOrder, isActive: section.isActive, itemCount: 0 } }, { status: 201 })
  } catch (err) {
    if (isDuplicateKeyError(err)) return NextResponse.json({ error: t('sections.api.exists', { name: parsed.data.name ?? '' }) }, { status: 409 })
    throw err
  }
}
