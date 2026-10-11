import { model, models, Schema, type InferSchemaType, type Model } from 'mongoose'

export const USER_ROLES = ['admin', 'manager', 'cashier', 'kitchen'] as const

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'admin' },
  },
  { timestamps: true },
)

export type UserDoc = InferSchemaType<typeof userSchema>

export const User: Model<UserDoc> = models.User || model<UserDoc>('User', userSchema)
