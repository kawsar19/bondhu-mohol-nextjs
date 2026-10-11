import { Schema, type InferSchemaType } from 'mongoose'
import { defineModel } from './define-model'

const menuItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, default: '', maxlength: 300 },
    price: { type: Number, required: true, min: 0, max: 100000 },
    category: { type: String, required: true, trim: true, maxlength: 40 },
    image: { type: String, trim: true, default: '' },
    isAvailable: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
  },
  { timestamps: true },
)

menuItemSchema.index({ category: 1, name: 1 })

export type MenuItemDoc = InferSchemaType<typeof menuItemSchema>

export const MenuItem = defineModel<MenuItemDoc>('MenuItem', menuItemSchema)
