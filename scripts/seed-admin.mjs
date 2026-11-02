// Creates an admin account in a shop, or resets the password of an existing one.
// Usage: npm run seed:admin   (reads MONGODB_URI and ADMIN_* from .env.local)
// A new account goes in SHOP_ID, or the only shop if there is one. For a brand-new shop use create:shop.
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { pickShop } from './lib/pick-shop.mjs'

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
// An existing account keeps its shop; only a new one needs to be told where to go.
const existing = await users.findOne({ email }, { projection: { shop: 1 } })
let shop = existing?.shop
if (!shop) {
  try {
    shop = (await pickShop(mongoose.connection))._id
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

const result = await users.updateOne(
  { email },
  {
    $set: { name: ADMIN_NAME, passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12), role: 'admin', isActive: true, updatedAt: now },
    $setOnInsert: { email, shop, sessionVersion: 0, createdAt: now },
  },
  { upsert: true },
)
await users.createIndex({ email: 1 }, { unique: true })

console.log(result.upsertedCount ? `Created admin ${email}` : `Updated admin ${email}`)
await mongoose.disconnect()
