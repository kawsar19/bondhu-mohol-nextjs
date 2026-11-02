import { Schema, type InferSchemaType } from 'mongoose'
import { defineModel } from './define-model'
import { shopField, tenantPlugin } from './tenant'

export const INGREDIENT_UNITS = ['kg', 'litre', 'piece', 'packet'] as const
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number]

// A raw material bought at the bazar and kept in the mother store and section stocks.
const ingredientSchema = new Schema(
  {
    shop: shopField,
    name: { type: String, required: true, trim: true, maxlength: 40 },
    unit: { type: String, enum: INGREDIENT_UNITS, required: true },
    // Warn when the mother store has this much or less, in `unit`. Null means no warning.
    lowStock: { type: Number, min: 0, default: null },
    // A small photo so staff recognise it: a resized JPEG data URL from the dashboard, or a link.
    image: { type: String, default: '', maxlength: 200_000 },
    // Hidden ingredients keep their history but aren't offered for new entries.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

ingredientSchema.plugin(tenantPlugin)
ingredientSchema.index({ shop: 1, name: 1 }, { unique: true })

export type IngredientDoc = InferSchemaType<typeof ingredientSchema>

export const Ingredient = defineModel<IngredientDoc>('Ingredient', ingredientSchema)
