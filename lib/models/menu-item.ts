import { Schema, type InferSchemaType } from 'mongoose'
import { defineModel } from './define-model'

const menuItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, default: '', maxlength: 300 },
    price: { type: Number, required: true, min: 0, max: 100000 },
    // Which kitchen section makes it, so sales can be counted per section. The menu is grouped by it too.
    // Required for new items; items from before sections have none until they are edited.
    section: { type: Schema.Types.ObjectId, ref: 'Section', default: null },
    image: { type: String, trim: true, default: '' },
    isAvailable: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
  },
  { timestamps: true },
)

menuItemSchema.index({ section: 1, name: 1 })

export type MenuItemDoc = InferSchemaType<typeof menuItemSchema>

export const MenuItem = defineModel<MenuItemDoc>('MenuItem', menuItemSchema)
