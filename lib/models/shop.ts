import { Schema, type InferSchemaType } from 'mongoose'
import { defineModel } from './define-model'

// One restaurant using the system. Everything else (orders, menu, stock, staff…) points at one of these.
const shopSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    // Printed under the name on receipts.
    tagline: { type: String, trim: true, default: '', maxlength: 80 },
    address: { type: String, trim: true, default: '', maxlength: 160 },
    phone: { type: String, trim: true, default: '', maxlength: 30 },
    // Last line of the receipt.
    thanks: { type: String, trim: true, default: '', maxlength: 80 },
    // Start of every order code, e.g. BM-1001.
    orderPrefix: { type: String, trim: true, uppercase: true, default: 'ORD', maxlength: 6, match: /^[A-Z0-9]+$/ },
    // A switched-off shop's staff can't sign in, e.g. when the subscription has lapsed.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export type ShopDoc = InferSchemaType<typeof shopSchema>

export const Shop = defineModel<ShopDoc>('Shop', shopSchema)
