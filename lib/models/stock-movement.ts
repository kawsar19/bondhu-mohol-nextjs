import { Schema, type InferSchemaType } from 'mongoose'
import { defineModel } from './define-model'

export const MOVEMENT_TYPES = ['purchase', 'transfer', 'use', 'adjust'] as const
export type MovementType = (typeof MOVEMENT_TYPES)[number]

// One line for every time stock comes in or goes out. Stock is never stored; it is the sum of these.
//   purchase: bazar → mother store, with what it cost (also written to Expenses)
//   transfer: mother store → `section`
//   use:      used up in `section`
//   adjust:   counted by hand; `quantity` is the signed correction at `section` (null = mother store)
const stockMovementSchema = new Schema(
  {
    // Bangladesh midnight of the day it happened.
    date: { type: Date, required: true },
    type: { type: String, enum: MOVEMENT_TYPES, required: true },
    ingredient: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    // Where the stock changed: null is the mother store, a transfer names the section it went to.
    section: { type: Schema.Types.ObjectId, ref: 'Section', default: null },
    quantity: { type: Number, required: true },
    // Purchases only: total taka paid, and the expense entry made for it.
    cost: { type: Number, min: 0, default: 0 },
    expense: { type: Schema.Types.ObjectId, ref: 'Expense', default: null },
    paidTo: { type: String, trim: true, default: '', maxlength: 60 },
    note: { type: String, trim: true, default: '', maxlength: 200 },
    addedBy: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

stockMovementSchema.index({ type: 1, date: -1 })
stockMovementSchema.index({ ingredient: 1, section: 1 })

export type StockMovementDoc = InferSchemaType<typeof stockMovementSchema>

export const StockMovement = defineModel<StockMovementDoc>('StockMovement', stockMovementSchema)
