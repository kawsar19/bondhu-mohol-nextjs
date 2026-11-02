import { Schema, type InferSchemaType, type Types } from 'mongoose'
import { DEFAULT_EXPENSE_CATEGORIES } from '../expense-categories'
import { defineModel } from './define-model'
import { shopField, tenantPlugin } from './tenant'

const expenseCategorySchema = new Schema(
  {
    shop: shopField,
    name: { type: String, required: true, trim: true, maxlength: 40 },
    // A short example of what goes here, shown under the picker.
    hint: { type: String, trim: true, default: '', maxlength: 80 },
    // Hidden categories stay on old entries and in reports but aren't offered for new ones.
    isHidden: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
)

expenseCategorySchema.plugin(tenantPlugin)
expenseCategorySchema.index({ shop: 1, name: 1 }, { unique: true })

export type ExpenseCategoryDoc = InferSchemaType<typeof expenseCategorySchema>

export const ExpenseCategory = defineModel<ExpenseCategoryDoc>('ExpenseCategory', expenseCategorySchema)

/** A shop's categories in display order, creating the starter set the first time. */
export async function listExpenseCategories(shop: Types.ObjectId) {
  if ((await ExpenseCategory.countDocuments({ shop })) === 0) {
    // Two screens can ask at the same moment for a new shop. Waiting for the unique { shop, name }
    // index makes the second insert fail instead of saving every category twice.
    await ExpenseCategory.init()
    await ExpenseCategory.insertMany(DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({ ...c, shop, sortOrder: i })), { ordered: false }).catch(() => {})
  }
  return ExpenseCategory.find({ shop }).sort({ sortOrder: 1, name: 1 })
}
