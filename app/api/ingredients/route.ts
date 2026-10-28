import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { parseIngredientInput } from '@/lib/kitchen-input'
import { Ingredient } from '@/lib/models/ingredient'
import { isDuplicateKeyError } from '@/lib/table-input'

const view = (i: InstanceType<typeof Ingredient>) => ({ _id: i.id, name: i.name, unit: i.unit, isActive: i.isActive })

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  await connectDB()
  const ingredients = await Ingredient.find().sort({ name: 1 })
  return NextResponse.json({ ingredients: ingredients.map(view) })
}

export async function POST(request: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const t = await getT()
  const parsed = parseIngredientInput(await request.json().catch(() => null), t)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  try {
    const ingredient = await Ingredient.create(parsed.data)
    return NextResponse.json({ ingredient: view(ingredient) }, { status: 201 })
  } catch (err) {
    if (isDuplicateKeyError(err)) return NextResponse.json({ error: t('ingredients.api.exists', { name: parsed.data.name ?? '' }) }, { status: 409 })
    throw err
  }
}
