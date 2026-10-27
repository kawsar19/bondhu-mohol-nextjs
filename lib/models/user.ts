import { Schema, type InferSchemaType } from 'mongoose'
import { USER_ROLES } from '../permissions'
import { defineModel } from './define-model'

export { USER_ROLES }

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'admin' },
    isActive: { type: Boolean, default: true },
    // Bumped on password reset or disable, which signs the user out everywhere.
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export type UserDoc = InferSchemaType<typeof userSchema>

export const User = defineModel<UserDoc>('User', userSchema)
