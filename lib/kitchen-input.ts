import type { TFunction } from './i18n'
import { INGREDIENT_UNITS, type Ingredient, type IngredientUnit } from './models/ingredient'

type Result<T> = { data: T; error?: never } | { data?: never; error: string }

function name(raw: unknown, t: TFunction, prefix: 'sections' | 'ingredients'): { value?: string; error?: string } {
  if (typeof raw !== 'string') return { error: t(`${prefix}.api.nameRequired`) }
  const value = raw.trim()
  if (!value) return { error: t(`${prefix}.api.nameRequired`) }
  if (value.length > 40) return { error: t(`${prefix}.api.nameMax`, { max: 40 }) }
  return { value }
}

export type SectionInput = { name?: string; sortOrder?: number; isActive?: boolean }

/** Picks and validates the editable section fields. With `partial`, missing fields are allowed (for PATCH). */
export function parseSectionInput(body: unknown, t: TFunction, partial = false): Result<SectionInput> {
  if (!body || typeof body !== 'object') return { error: t('common.invalidRequest') }
  const raw = body as Record<string, unknown>
  const data: SectionInput = {}

  if (raw.name !== undefined) {
    const result = name(raw.name, t, 'sections')
    if (result.error) return { error: result.error }
    data.name = result.value
  } else if (!partial) return { error: t('sections.api.nameRequired') }

  if (raw.sortOrder !== undefined) {
    if (!Number.isInteger(raw.sortOrder)) return { error: t('sections.api.sortOrderInvalid') }
    data.sortOrder = raw.sortOrder as number
  }
  if (raw.isActive !== undefined) {
    if (typeof raw.isActive !== 'boolean') return { error: t('sections.api.isActiveInvalid') }
    data.isActive = raw.isActive
  }
  return { data }
}

/** What the dashboard gets for one ingredient. */
export const ingredientView = (i: InstanceType<typeof Ingredient>) => ({ _id: i.id, name: i.name, unit: i.unit, isActive: i.isActive, lowStock: i.lowStock ?? null, image: i.image ?? '' })

export type IngredientInput = { name?: string; unit?: IngredientUnit; isActive?: boolean; lowStock?: number | null; image?: string }

// The dashboard shrinks photos to about 30 KB before sending; this leaves room without letting huge files in.
const MAX_IMAGE_CHARS = 200_000
const DATA_IMAGE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/

/** Picks and validates the editable ingredient fields. With `partial`, missing fields are allowed (for PATCH). */
export function parseIngredientInput(body: unknown, t: TFunction, partial = false): Result<IngredientInput> {
  if (!body || typeof body !== 'object') return { error: t('common.invalidRequest') }
  const raw = body as Record<string, unknown>
  const data: IngredientInput = {}

  if (raw.name !== undefined) {
    const result = name(raw.name, t, 'ingredients')
    if (result.error) return { error: result.error }
    data.name = result.value
  } else if (!partial) return { error: t('ingredients.api.nameRequired') }

  if (raw.unit !== undefined) {
    if (!INGREDIENT_UNITS.includes(raw.unit as IngredientUnit)) return { error: t('ingredients.api.unitInvalid') }
    data.unit = raw.unit as IngredientUnit
  } else if (!partial) return { error: t('ingredients.api.unitInvalid') }

  if (raw.isActive !== undefined) {
    if (typeof raw.isActive !== 'boolean') return { error: t('ingredients.api.isActiveInvalid') }
    data.isActive = raw.isActive
  }

  // Empty or null clears the warning.
  if (raw.lowStock !== undefined) {
    if (raw.lowStock === null || raw.lowStock === '') data.lowStock = null
    else {
      const value = Number(raw.lowStock)
      if (!Number.isFinite(value) || value < 0 || value > 1_000_000) return { error: t('ingredients.api.lowStockInvalid') }
      data.lowStock = Math.round(value * 1000) / 1000
    }
  }

  if (raw.image !== undefined) {
    const image = typeof raw.image === 'string' ? raw.image.trim() : null
    if (image === null) return { error: t('ingredients.api.imageInvalid') }
    if (image.startsWith('data:')) {
      if (image.length > MAX_IMAGE_CHARS) return { error: t('ingredients.api.imageTooBig') }
      if (!DATA_IMAGE.test(image)) return { error: t('ingredients.api.imageInvalid') }
    } else if (image && (image.length > 500 || !(/^https?:\/\//i.test(image) || image.startsWith('/')))) return { error: t('ingredients.api.imageInvalid') }
    data.image = image
  }
  return { data }
}
