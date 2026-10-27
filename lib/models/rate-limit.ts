import { Schema } from 'mongoose'
import { defineModel } from './define-model'

// One counter per key per time window. MongoDB deletes it once the window is over.
const rateLimitSchema = new Schema({
  _id: { type: String, required: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
})

rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const RateLimit = defineModel<{ _id: string; count: number; expiresAt: Date }>('RateLimit', rateLimitSchema)
