import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { ingredientView, parseIngredientInput } from '@/lib/kitchen-input'
import { Ingredient } from '@/lib/models/ingredient'
import { motherStoreStock } from '@/lib/stock'
import { isDuplicateKeyError } from '@/lib/table-input'


export async function GET() {
  const { session, error } = await requireAdmin()
  if (error) return error

  await connectDB()
  const [ingredients, stock] = await Promise.all([Ingredient.find({ shop: session.shop }).sort({ name: 1 }), motherStoreStock(session.shop)])
  // `stock` is what the mother store has now, so the list can flag what is running low.
  return NextResponse.json({ ingredients: ingredients.map(i => ({ ...ingredientView(i), stock: stock.get(i.id)?.stock ?? 0 })) })
}

export async function POST(request: Request) {
  const { session, error } = await requireAdmin()
  if (error) return error

  const t = await getT()
  const parsed = parseIngredientInput(await request.json().catch(() => null), t)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  try {
    const ingredient = await Ingredient.create({ ...parsed.data, shop: session.shop })
    return NextResponse.json({ ingredient: { ...ingredientView(ingredient), stock: 0 } }, { status: 201 })
  } catch (err) {
    if (isDuplicateKeyError(err)) return NextResponse.json({ error: t('ingredients.api.exists', { name: parsed.data.name ?? '' }) }, { status: 409 })
    throw err
  }
}
