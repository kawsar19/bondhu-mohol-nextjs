import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { ingredientView, parseIngredientInput } from '@/lib/kitchen-input'
import { Ingredient } from '@/lib/models/ingredient'
import { StockMovement } from '@/lib/models/stock-movement'
import { isDuplicateKeyError } from '@/lib/table-input'

type Context = { params: Promise<{ id: string }> }

const notFound = async () => NextResponse.json({ error: (await getT())('ingredients.api.notFound') }, { status: 404 })

export async function PATCH(request: Request, { params }: Context) {
  const { session, error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  const t = await getT()
  const parsed = parseIngredientInput(await request.json().catch(() => null), t, true)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  try {
    const ingredient = await Ingredient.findOneAndUpdate({ _id: id, shop: session.shop }, parsed.data, { new: true, runValidators: true })
    return ingredient ? NextResponse.json({ ingredient: ingredientView(ingredient) }) : notFound()
  } catch (err) {
    if (isDuplicateKeyError(err)) return NextResponse.json({ error: t('ingredients.api.exists', { name: parsed.data.name ?? '' }) }, { status: 409 })
    throw err
  }
}

// An ingredient with stock entries keeps its history, so it must be hidden instead.
export async function DELETE(_request: Request, { params }: Context) {
  const { session, error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  await connectDB()
  if (await StockMovement.exists({ shop: session.shop, ingredient: id })) return NextResponse.json({ error: (await getT())('ingredients.api.inUse') }, { status: 409 })
  const ingredient = await Ingredient.findOneAndDelete({ _id: id, shop: session.shop })
  return ingredient ? NextResponse.json({ ok: true }) : notFound()
}
