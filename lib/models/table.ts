import { model, models, Schema, type InferSchemaType, type Model } from 'mongoose'

export const TABLE_SECTIONS = ['Restaurant', 'Tea stall'] as const
export const TABLE_STATUSES = ['Available', 'Occupied', 'Reserved'] as const

const tableSchema = new Schema(
  {
    number: { type: Number, required: true, unique: true, min: 1 },
    name: { type: String, trim: true, default: '' },
    section: { type: String, enum: TABLE_SECTIONS, default: 'Restaurant' },
    capacity: { type: Number, required: true, min: 1, max: 50, default: 4 },
    status: { type: String, enum: TABLE_STATUSES, default: 'Available' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export type TableDoc = InferSchemaType<typeof tableSchema>

export const Table: Model<TableDoc> = models.Table || model<TableDoc>('Table', tableSchema)
