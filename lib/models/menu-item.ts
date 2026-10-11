import { model, models, Schema, type InferSchemaType, type Model } from 'mongoose'

export const MENU_SECTIONS = ['Restaurant', 'Tea stall'] as const

const menuItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, default: '', maxlength: 300 },
    price: { type: Number, required: true, min: 0, max: 100000 },
    category: { type: String, required: true, trim: true, maxlength: 40 },
    section: { type: String, enum: MENU_SECTIONS, default: 'Restaurant' },
    image: { type: String, trim: true, default: '' },
    isAvailable: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
  },
  { timestamps: true },
)

menuItemSchema.index({ section: 1, category: 1, name: 1 })

export type MenuItemDoc = InferSchemaType<typeof menuItemSchema>

export const MenuItem: Model<MenuItemDoc> = models.MenuItem || model<MenuItemDoc>('MenuItem', menuItemSchema)
