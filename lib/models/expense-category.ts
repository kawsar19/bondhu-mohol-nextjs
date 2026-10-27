import { Schema, type InferSchemaType } from 'mongoose'
import { DEFAULT_EXPENSE_CATEGORIES } from '../expense-categories'
import { defineModel } from './define-model'

const expenseCategorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 40 },
    // A short example of what goes here, shown under the picker.
    hint: { type: String, trim: true, default: '', maxlength: 80 },
    // Hidden categories stay on old entries and in reports but aren't offered for new ones.
    isHidden: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export type ExpenseCategoryDoc = InferSchemaType<typeof expenseCategorySchema>

export const ExpenseCategory = defineModel<ExpenseCategoryDoc>('ExpenseCategory', expenseCategorySchema)

/** All categories in display order, creating the starter set the first time. */
export async function listExpenseCategories() {
  if ((await ExpenseCategory.estimatedDocumentCount()) === 0) {
    await ExpenseCategory.insertMany(DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({ ...c, sortOrder: i })), { ordered: false }).catch(() => {})
  }
  return ExpenseCategory.find().sort({ sortOrder: 1, name: 1 })
}
