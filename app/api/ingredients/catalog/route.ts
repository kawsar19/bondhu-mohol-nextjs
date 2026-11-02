import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { CATALOG_CATEGORIES, CATALOG_ITEMS } from '@/lib/ingredient-catalog'
import { ingredientView } from '@/lib/kitchen-input'
import { Ingredient } from '@/lib/models/ingredient'

const key = (name: string) => name.trim().toLowerCase()

// The ready-made list, marking what this shop already has (matched by name).
export async function GET() {
  const { session, error } = await requireAdmin()
  if (error) return error

  await connectDB()
  const have = new Set((await Ingredient.find({ shop: session.shop }).select('name').lean()).map(i => key(i.name)))
  return NextResponse.json({ categories: CATALOG_CATEGORIES, items: CATALOG_ITEMS.map(i => ({ ...i, added: have.has(key(i.name)) })) })
}

// Adds the chosen items. Ones the shop already has are skipped, so picking twice is harmless.
export async function POST(request: Request) {
  const { session, error } = await requireAdmin()
  if (error) return error

  const t = await getT()
  const body = await request.json().catch(() => null)
  const keys: unknown = body?.keys
  if (!Array.isArray(keys) || keys.length === 0 || keys.length > CATALOG_ITEMS.length || !keys.every(k => typeof k === 'string')) return NextResponse.json({ error: t('ingredients.catalog.chooseSome') }, { status: 400 })
  const wanted = new Set(keys)
  const chosen = CATALOG_ITEMS.filter(i => wanted.has(i.key))
  if (chosen.length === 0) return NextResponse.json({ error: t('ingredients.catalog.chooseSome') }, { status: 400 })

  await connectDB()
  const have = new Set((await Ingredient.find({ shop: session.shop }).select('name').lean()).map(i => key(i.name)))
  const fresh = chosen.filter(i => !have.has(key(i.name)))
  // ordered: false keeps going past a name someone added a moment ago (unique { shop, name } index).
  const created = fresh.length
    ? await Ingredient.insertMany(fresh.map(i => ({ shop: session.shop, name: i.name, unit: i.unit, image: i.image })), { ordered: false }).catch((err: { insertedDocs?: InstanceType<typeof Ingredient>[] }) => err.insertedDocs ?? [])
    : []
  return NextResponse.json({ added: created.length, skipped: chosen.length - created.length, ingredients: created.map(i => ({ ...ingredientView(i), stock: 0 })) }, { status: 201 })
}
