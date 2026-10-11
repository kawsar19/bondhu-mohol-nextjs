export type MenuInput = {
  name?: string
  description?: string
  price?: number
  category?: string
  image?: string
  isAvailable?: boolean
  isPopular?: boolean
}

type Result = { data: MenuInput; error?: never } | { data?: never; error: string }

function text(raw: unknown, field: string, max: number, required: boolean): { value?: string; error?: string } {
  if (raw === undefined) return required ? { error: `${field} is required` } : {}
  if (typeof raw !== 'string') return { error: `${field} must be text` }
  const value = raw.trim()
  if (required && !value) return { error: `${field} is required` }
  if (value.length > max) return { error: `${field} must be ${max} characters or less` }
  return { value }
}

/** Picks and validates the editable menu fields. With `partial`, missing fields are allowed (for PATCH). */
export function parseMenuInput(body: unknown, partial = false): Result {
  if (!body || typeof body !== 'object') return { error: 'Invalid request body' }
  const raw = body as Record<string, unknown>
  const data: MenuInput = {}

  const name = text(raw.name, 'Name', 80, !partial)
  if (name.error) return { error: name.error }
  if (name.value !== undefined) {
    if (!name.value) return { error: 'Name is required' }
    data.name = name.value
  }

  const category = text(raw.category, 'Category', 40, !partial)
  if (category.error) return { error: category.error }
  if (category.value !== undefined) {
    if (!category.value) return { error: 'Category is required' }
    data.category = category.value
  }

  const description = text(raw.description, 'Description', 300, false)
  if (description.error) return { error: description.error }
  if (description.value !== undefined) data.description = description.value

  if (raw.price !== undefined) {
    const price = Number(raw.price)
    if (raw.price === '' || !Number.isFinite(price) || price < 0 || price > 100000) return { error: 'Price must be between 0 and 100000' }
    data.price = Math.round(price * 100) / 100
  } else if (!partial) return { error: 'Price is required' }

  const image = text(raw.image, 'Image URL', 500, false)
  if (image.error) return { error: image.error }
  if (image.value !== undefined) {
    if (image.value && !/^https?:\/\//i.test(image.value) && !image.value.startsWith('/')) return { error: 'Image must be an http(s) URL or a path starting with /' }
    data.image = image.value
  }

  for (const key of ['isAvailable', 'isPopular'] as const) {
    if (raw[key] === undefined) continue
    if (typeof raw[key] !== 'boolean') return { error: `${key} must be true or false` }
    data[key] = raw[key]
  }
  return { data }
}
