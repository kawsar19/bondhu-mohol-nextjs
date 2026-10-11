// Creates (or resets the password of) the first admin account.
// Usage: npm run seed:admin   (reads MONGODB_URI and ADMIN_* from .env.local)
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

const { MONGODB_URI, ADMIN_NAME = 'Admin', ADMIN_EMAIL, ADMIN_PASSWORD } = process.env

if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD in .env.local first.')
  process.exit(1)
}
if (ADMIN_PASSWORD.length < 8) {
  console.error('ADMIN_PASSWORD must be at least 8 characters.')
  process.exit(1)
}

await mongoose.connect(MONGODB_URI)
const users = mongoose.connection.collection('users')
const email = ADMIN_EMAIL.trim().toLowerCase()
const now = new Date()

const result = await users.updateOne(
  { email },
  {
    $set: { name: ADMIN_NAME, passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12), role: 'admin', updatedAt: now },
    $setOnInsert: { email, createdAt: now },
  },
  { upsert: true },
)
await users.createIndex({ email: 1 }, { unique: true })

console.log(result.upsertedCount ? `Created admin ${email}` : `Updated admin ${email}`)
await mongoose.disconnect()
