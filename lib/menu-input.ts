import type { TFunction } from './i18n'

export type MenuInput = {
  name?: string
  description?: string
  price?: number
  section?: string
  image?: string
  isAvailable?: boolean
  isPopular?: boolean
}

type Result = { data: MenuInput; error?: never } | { data?: never; error: string }

function text(raw: unknown, field: string, max: number, required: boolean, t: TFunction): { value?: string; error?: string } {
  if (raw === undefined) return required ? { error: t('menu.api.fieldRequired', { field }) } : {}
  if (typeof raw !== 'string') return { error: t('menu.api.fieldText', { field }) }
  const value = raw.trim()
  if (required && !value) return { error: t('menu.api.fieldRequired', { field }) }
  if (value.length > max) return { error: t('menu.api.fieldMax', { field, max }) }
  return { value }
}

/** Picks and validates the editable menu fields. With `partial`, missing fields are allowed (for PATCH). */
export function parseMenuInput(body: unknown, t: TFunction, partial = false): Result {
  if (!body || typeof body !== 'object') return { error: t('common.invalidRequest') }
  const raw = body as Record<string, unknown>
  const data: MenuInput = {}

  const name = text(raw.name, t('menu.api.fields.name'), 80, !partial, t)
  if (name.error) return { error: name.error }
  if (name.value !== undefined) {
    if (!name.value) return { error: t('menu.api.fieldRequired', { field: t('menu.api.fields.name') }) }
    data.name = name.value
  }

  // Every item belongs to a section, which is how the menu is grouped. Whether it exists is checked by the route.
  if (raw.section !== undefined) {
    if (raw.section === null || raw.section === '') return { error: t('menu.api.sectionRequired') }
    if (typeof raw.section !== 'string' || !/^[a-f\d]{24}$/i.test(raw.section)) return { error: t('menu.api.sectionInvalid') }
    data.section = raw.section
  } else if (!partial) return { error: t('menu.api.sectionRequired') }

  const description = text(raw.description, t('menu.api.fields.description'), 300, false, t)
  if (description.error) return { error: description.error }
  if (description.value !== undefined) data.description = description.value

  if (raw.price !== undefined) {
    const price = Number(raw.price)
    if (raw.price === '' || !Number.isFinite(price) || price < 0 || price > 100000) return { error: t('menu.api.priceInvalid') }
    data.price = Math.round(price * 100) / 100
  } else if (!partial) return { error: t('menu.api.priceRequired') }

  const image = text(raw.image, t('menu.api.fields.image'), 500, false, t)
  if (image.error) return { error: image.error }
  if (image.value !== undefined) {
    if (image.value && !/^https?:\/\//i.test(image.value) && !image.value.startsWith('/')) return { error: t('menu.api.imageInvalid') }
    data.image = image.value
  }

  for (const key of ['isAvailable', 'isPopular'] as const) {
    if (raw[key] === undefined) continue
    if (typeof raw[key] !== 'boolean') return { error: t('menu.api.flagInvalid', { key }) }
    data[key] = raw[key]
  }
  return { data }
}
