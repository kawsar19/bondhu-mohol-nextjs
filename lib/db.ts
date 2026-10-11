import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }

// Reuse the connection across hot reloads in dev and across invocations in serverless.
const globalForMongoose = globalThis as unknown as { mongoose?: Cache }
const cached: Cache = globalForMongoose.mongoose ?? (globalForMongoose.mongoose = { conn: null, promise: null })

export async function connectDB() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI is not set. Add it to .env.local')
  if (cached.conn) return cached.conn
  cached.promise ??= mongoose.connect(MONGODB_URI, { bufferCommands: false })
  try {
    cached.conn = await cached.promise
  } catch (error) {
    cached.promise = null
    throw error
  }
  return cached.conn
}
