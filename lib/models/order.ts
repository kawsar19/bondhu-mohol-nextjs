import { Schema, type InferSchemaType } from 'mongoose'
import { defineModel } from './define-model'

export const ORDER_TYPES = ['Dine in', 'Takeaway'] as const
// The manager enters orders after the fact, so there is no kitchen workflow: an order counts
// as sold unless it was cancelled. Older orders were moved to Completed by scripts/migrate-v2.mjs.
export const ORDER_STATUSES = ['Completed', 'Cancelled'] as const
export const PAYMENT_STATUSES = ['Unpaid', 'Paid'] as const
export const PAYMENT_METHODS = ['Cash', 'bKash', 'Nagad', 'Card'] as const

const orderItemSchema = new Schema(
  {
    menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    // Price at the time of ordering, so later menu price changes don't rewrite history.
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    // Section that made it, at the time of ordering, so moving a menu item later doesn't move its old sales.
    // Unset on orders from before this was recorded; reports fall back to the item's current section.
    section: { type: Schema.Types.ObjectId, ref: 'Section', default: null },
  },
  { _id: false },
)

const orderSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    type: { type: String, enum: ORDER_TYPES, required: true },
    tableNumber: { type: Number, min: 1 },
    customerName: { type: String, trim: true, default: '' },
    // Only on orders guests placed from the old QR menu.
    phone: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    items: { type: [orderItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'Completed' },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'Unpaid' },
    // How it was paid; empty while unpaid (and on orders paid before this was recorded).
    paymentMethod: { type: String, enum: [...PAYMENT_METHODS, ''], default: '' },
    paidAt: { type: Date },
    // Name of the staff member who entered it.
    takenBy: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

orderSchema.index({ createdAt: -1 })
orderSchema.index({ status: 1, createdAt: -1 })

export type OrderDoc = InferSchemaType<typeof orderSchema>
export const Order = defineModel<OrderDoc>('Order', orderSchema)

const counterSchema = new Schema({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } })
export const Counter = defineModel<{ _id: string; seq: number }>('Counter', counterSchema)
