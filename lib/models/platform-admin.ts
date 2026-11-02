import { Schema, type InferSchemaType } from 'mongoose'
import { defineModel } from './define-model'

// The people who run the platform itself: they create shops and switch them on or off.
// Not tied to any shop, so they live apart from User and can't sign in to a shop's dashboard.
const platformAdminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },
    // Bumped on password reset or disable, which signs them out everywhere.
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export type PlatformAdminDoc = InferSchemaType<typeof platformAdminSchema>

export const PlatformAdmin = defineModel<PlatformAdminDoc>('PlatformAdmin', platformAdminSchema)
