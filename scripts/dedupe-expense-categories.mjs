// One-off fix for expense categories saved twice when two screens seeded a new database at once.
// Usage: node --env-file=.env.local scripts/dedupe-expense-categories.mjs   Safe to run more than once.
// Keeps the oldest copy of each name in each shop, removes later copies only when they match it exactly,
// then adds the unique { shop, name } index that the duplicates kept from being built.
// Expenses store the category name, not its id, so no entry is affected.
import mongoose from 'mongoose'

const { MONGODB_URI } = process.env

if (!MONGODB_URI) {
  console.error('Set MONGODB_URI in .env.local first.')
  process.exit(1)
}

await mongoose.connect(MONGODB_URI)
const categories = mongoose.connection.collection('expensecategories')

const kept = new Map()
const extra = []
for (const category of await categories.find().sort({ createdAt: 1, _id: 1 }).toArray()) {
  const key = `${category.shop}|${category.name}`
  const first = kept.get(key)
  if (!first) kept.set(key, category)
  else if (first.hint === category.hint && first.isHidden === category.isHidden && first.sortOrder === category.sortOrder) extra.push(category._id)
  else console.log(`Left alone, the copies of "${category.name}" differ. Delete one from the Expenses screen.`)
}

const { deletedCount } = await categories.deleteMany({ _id: { $in: extra } })
console.log(`Duplicate categories removed: ${deletedCount}`)
try {
  await categories.createIndex({ shop: 1, name: 1 }, { unique: true, name: 'shop_1_name_1' })
  console.log('Unique { shop, name } index is in place.')
} catch (err) {
  console.log(`Could not add the unique name index: ${err.message}`)
}
await mongoose.disconnect()
