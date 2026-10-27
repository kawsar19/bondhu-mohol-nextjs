import { Schema, type InferSchemaType } from 'mongoose'
import { defineModel } from './define-model'

// Money spent by the shop: daily bazar, groceries, wages, bills and so on.
const expenseSchema = new Schema(
  {
    // Bangladesh midnight of the day the purchase was made.
    date: { type: Date, required: true },
    // Name of an ExpenseCategory; renaming a category updates these too.
    category: { type: String, required: true, trim: true, maxlength: 40 },
    item: { type: String, required: true, trim: true, maxlength: 80 },
    quantity: { type: String, trim: true, default: '', maxlength: 30 },
    amount: { type: Number, required: true, min: 0, max: 10000000 },
    paidTo: { type: String, trim: true, default: '', maxlength: 60 },
    note: { type: String, trim: true, default: '', maxlength: 200 },
    addedBy: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

expenseSchema.index({ date: -1, createdAt: -1 })
expenseSchema.index({ category: 1 })

export type ExpenseDoc = InferSchemaType<typeof expenseSchema>

export const Expense = defineModel<ExpenseDoc>('Expense', expenseSchema)
