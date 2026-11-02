// The ready-made list of raw materials a Bangladeshi restaurant buys, which a shop can pick from
// instead of typing each one. Data: data/ingredient-catalog.json; photos: public/catalog (see
// scripts/fetch-catalog-images.mjs), with their credits shown on /credits.
import catalog from '@/data/ingredient-catalog.json'
import credits from '@/data/ingredient-catalog-credits.json'
import type { IngredientUnit } from './models/ingredient'

export type CatalogCategory = { key: string; name: string; nameEn: string }
export type CatalogItem = { key: string; name: string; nameEn: string; unit: IngredientUnit; category: string; image: string }
export type PhotoCredit = { file: string; artist: string; license: string; licenseUrl: string; source: string; image: string }

const photoCredits = credits as Record<string, PhotoCredit>

export const CATALOG_CATEGORIES: CatalogCategory[] = catalog.categories
export const CATALOG_ITEMS: CatalogItem[] = catalog.items.map(i => ({
  key: i.key,
  name: i.name,
  nameEn: i.nameEn,
  unit: i.unit as IngredientUnit,
  category: i.category,
  image: photoCredits[i.key]?.image ?? '',
}))

/** Photo credits in catalog order, for the credits page. */
export function catalogCredits() {
  return CATALOG_ITEMS.filter(i => photoCredits[i.key]).map(i => ({ name: i.name, nameEn: i.nameEn, ...photoCredits[i.key] }))
}
