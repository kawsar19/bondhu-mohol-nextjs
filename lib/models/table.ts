import { Schema, type InferSchemaType } from 'mongoose'
import { defineModel } from './define-model'

export const TABLE_STATUSES = ['Available', 'Occupied', 'Reserved'] as const

const tableSchema = new Schema(
  {
    number: { type: Number, required: true, unique: true, min: 1 },
    name: { type: String, trim: true, default: '' },
    capacity: { type: Number, required: true, min: 1, max: 50, default: 4 },
    status: { type: String, enum: TABLE_STATUSES, default: 'Available' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export type TableDoc = InferSchemaType<typeof tableSchema>

export const Table = defineModel<TableDoc>('Table', tableSchema)
