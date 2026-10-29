import { Schema, type InferSchemaType } from 'mongoose'
import { defineModel } from './define-model'

// What the manager writes for one section at the end of one day. The stock side of it is also
// written as StockMovements (linked by `sectionDay`), so stock stays the sum of movements.
const sectionDaySchema = new Schema(
  {
    section: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    // Bangladesh midnight of the day.
    date: { type: Date, required: true },
    // Per ingredient: how much was used and how much was left at the end of the day.
    items: [
      {
        _id: false,
        ingredient: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
        used: { type: Number, required: true, min: 0 },
        closing: { type: Number, required: true, min: 0 },
      },
    ],
    // Pieces or cups made, e.g. 120 cups of tea. The name is kept in case the menu item is renamed or deleted.
    production: [
      {
        _id: false,
        menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', default: null },
        name: { type: String, required: true, trim: true, maxlength: 80 },
        quantity: { type: Number, required: true, min: 0 },
      },
    ],
    // Leftover cooked food the owners took home. Cooked food isn't in ingredient stock, so this is free text.
    ownersShare: [
      {
        _id: false,
        item: { type: String, required: true, trim: true, maxlength: 60 },
        quantity: { type: String, trim: true, default: '', maxlength: 30 },
        takenBy: { type: String, trim: true, default: '', maxlength: 60 },
      },
    ],
    note: { type: String, trim: true, default: '', maxlength: 300 },
    enteredBy: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

sectionDaySchema.index({ section: 1, date: 1 }, { unique: true })
sectionDaySchema.index({ date: -1 })

export type SectionDayDoc = InferSchemaType<typeof sectionDaySchema>

export const SectionDay = defineModel<SectionDayDoc>('SectionDay', sectionDaySchema)
