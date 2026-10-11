import { model, models, Schema, type InferSchemaType, type Model } from 'mongoose'

export const ORDER_TYPES = ['Dine in', 'Takeaway'] as const
export const ORDER_STATUSES = ['Pending', 'Preparing', 'Ready', 'Served', 'Completed', 'Cancelled'] as const
export const PAYMENT_STATUSES = ['Unpaid', 'Paid'] as const
export const OPEN_STATUSES = ['Pending', 'Preparing', 'Ready', 'Served'] as const

const orderItemSchema = new Schema(
  {
    menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    // Price at the time of ordering, so later menu price changes don't rewrite history.
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false },
)

const orderSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    type: { type: String, enum: ORDER_TYPES, required: true },
    tableNumber: { type: Number, min: 1 },
    customerName: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    items: { type: [orderItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'Pending' },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'Unpaid' },
    trackingToken: { type: String, required: true, select: false },
  },
  { timestamps: true },
)

orderSchema.index({ createdAt: -1 })
orderSchema.index({ status: 1, createdAt: -1 })

export type OrderDoc = InferSchemaType<typeof orderSchema>
export const Order: Model<OrderDoc> = models.Order || model<OrderDoc>('Order', orderSchema)

const counterSchema = new Schema({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } })
export const Counter = models.Counter || model('Counter', counterSchema)
