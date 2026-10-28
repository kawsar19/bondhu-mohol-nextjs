import { Schema, type InferSchemaType } from 'mongoose'
import { defineModel } from './define-model'

export const INGREDIENT_UNITS = ['kg', 'litre', 'piece', 'packet'] as const
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number]

// A raw material bought at the bazar and kept in the mother store and section stocks.
const ingredientSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 40 },
    unit: { type: String, enum: INGREDIENT_UNITS, required: true },
    // Hidden ingredients keep their history but aren't offered for new entries.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export type IngredientDoc = InferSchemaType<typeof ingredientSchema>

export const Ingredient = defineModel<IngredientDoc>('Ingredient', ingredientSchema)
