// Creates (or resets the password of) a super admin, who signs in at /platform to create and manage shops.
// Usage: npm run seed:superadmin   (reads MONGODB_URI and SUPERADMIN_* from .env.local or the command line)
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

const { MONGODB_URI, SUPERADMIN_NAME = 'Super admin', SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env

if (!MONGODB_URI || !SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
  console.error('Set MONGODB_URI, SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD first.')
  process.exit(1)
}
if (SUPERADMIN_PASSWORD.length < 12) {
  console.error('SUPERADMIN_PASSWORD must be at least 12 characters: this account can switch every shop off.')
  process.exit(1)
}

await mongoose.connect(MONGODB_URI)
const admins = mongoose.connection.collection('platformadmins')
const email = SUPERADMIN_EMAIL.trim().toLowerCase()
const now = new Date()

const result = await admins.updateOne(
  { email },
  {
    $set: { name: SUPERADMIN_NAME, passwordHash: await bcrypt.hash(SUPERADMIN_PASSWORD, 12), isActive: true, updatedAt: now },
    // A reset signs the old sessions out.
    $inc: { sessionVersion: 1 },
    $setOnInsert: { email, createdAt: now },
  },
  { upsert: true },
)
await admins.createIndex({ email: 1 }, { unique: true })

console.log(result.upsertedCount ? `Created super admin ${email}` : `Reset super admin ${email}`)
await mongoose.disconnect()
