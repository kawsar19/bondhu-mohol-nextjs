import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { listExpenseCategories } from '@/lib/models/expense-category'
import { Ingredient } from '@/lib/models/ingredient'
import { Section } from '@/lib/models/section'
import { STORE_KEEPERS } from '@/lib/permissions'
import { motherStoreStock, sectionStock } from '@/lib/stock'

// Mother store stock of every ingredient, each section's kitchen stock, and the expense categories a purchase can be filed under.
export async function GET() {
  const { error } = await requireRole(STORE_KEEPERS)
  if (error) return error

  await connectDB()
  const [ingredients, stock, sections, kitchens, categories] = await Promise.all([
    Ingredient.find().sort({ name: 1 }),
    motherStoreStock(),
    Section.find().sort({ sortOrder: 1, name: 1 }),
    sectionStock(),
    listExpenseCategories(),
  ])
  return NextResponse.json({
    ingredients: ingredients.map(i => {
      const s = stock.get(i.id)
      // Average of every purchase so far, as the plan values used stock at average price.
      const avgPrice = s && s.bought > 0 ? Math.round((s.spent / s.bought) * 100) / 100 : null
      return { _id: i.id, name: i.name, unit: i.unit, isActive: i.isActive, stock: s?.stock ?? 0, avgPrice }
    }),
    // `stock` maps ingredient id to quantity, for ingredients the section has ever had.
    sections: sections.map(s => ({ _id: s.id, name: s.name, isActive: s.isActive, stock: Object.fromEntries(kitchens.get(s.id) ?? []) })),
    categories: categories.filter(c => !c.isHidden).map(c => c.name),
  })
}
