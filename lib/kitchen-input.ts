import type { TFunction } from './i18n'
import { INGREDIENT_UNITS, type IngredientUnit } from './models/ingredient'

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

export type IngredientInput = { name?: string; unit?: IngredientUnit; isActive?: boolean }

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
  return { data }
}
