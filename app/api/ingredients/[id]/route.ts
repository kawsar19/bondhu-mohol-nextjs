import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { parseIngredientInput } from '@/lib/kitchen-input'
import { Ingredient } from '@/lib/models/ingredient'
import { isDuplicateKeyError } from '@/lib/table-input'

type Context = { params: Promise<{ id: string }> }

const notFound = async () => NextResponse.json({ error: (await getT())('ingredients.api.notFound') }, { status: 404 })

export async function PATCH(request: Request, { params }: Context) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  const t = await getT()
  const parsed = parseIngredientInput(await request.json().catch(() => null), t, true)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  try {
    const ingredient = await Ingredient.findByIdAndUpdate(id, parsed.data, { new: true, runValidators: true })
    return ingredient ? NextResponse.json({ ingredient: { _id: ingredient.id, name: ingredient.name, unit: ingredient.unit, isActive: ingredient.isActive } }) : notFound()
  } catch (err) {
    if (isDuplicateKeyError(err)) return NextResponse.json({ error: t('ingredients.api.exists', { name: parsed.data.name ?? '' }) }, { status: 409 })
    throw err
  }
}

// Stock entries don't exist yet; once they do, an ingredient that has any must be hidden instead.
export async function DELETE(_request: Request, { params }: Context) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  await connectDB()
  const ingredient = await Ingredient.findByIdAndDelete(id)
  return ingredient ? NextResponse.json({ ok: true }) : notFound()
}
