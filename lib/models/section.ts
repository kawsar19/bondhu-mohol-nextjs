import { Schema, type InferSchemaType } from 'mongoose'
import { defineModel } from './define-model'

// A counter in the restaurant with its own kitchen stock, e.g. Rumali roti, Burger, Tea & coffee.
const sectionSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 40 },
    sortOrder: { type: Number, default: 0 },
    // Closed sections stay on old menu items and in reports but aren't offered for new ones.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export type SectionDoc = InferSchemaType<typeof sectionSchema>

export const Section = defineModel<SectionDoc>('Section', sectionSchema)
