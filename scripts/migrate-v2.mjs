// One-off move to the manager-entry workflow (docs/new-requirements-plan.md, step 1).
// Usage: npm run migrate:v2   (reads MONGODB_URI from .env.local). Safe to run more than once.
// - cashier, waiter and kitchen accounts become managers
// - orders still in a kitchen status (Pending, Preparing, Ready, Served) become Completed
// - fields only the guest QR menu used are dropped from orders
import mongoose from 'mongoose'

const { MONGODB_URI } = process.env

if (!MONGODB_URI) {
  console.error('Set MONGODB_URI in .env.local first.')
  process.exit(1)
}

await mongoose.connect(MONGODB_URI)
const db = mongoose.connection

const roles = await db.collection('users').updateMany(
  { role: { $in: ['cashier', 'waiter', 'kitchen'] } },
  { $set: { role: 'manager', updatedAt: new Date() } },
)
const statuses = await db.collection('orders').updateMany(
  { status: { $in: ['Pending', 'Preparing', 'Ready', 'Served'] } },
  { $set: { status: 'Completed' } },
)
const fields = await db.collection('orders').updateMany(
  { $or: [{ trackingToken: { $exists: true } }, { source: { $exists: true } }] },
  { $unset: { trackingToken: '', source: '' } },
)

console.log(`Accounts moved to manager: ${roles.modifiedCount}`)
console.log(`Open orders marked Completed: ${statuses.modifiedCount}`)
console.log(`Orders cleaned of QR-menu fields: ${fields.modifiedCount}`)
await mongoose.disconnect()
