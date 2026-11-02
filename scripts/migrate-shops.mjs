// One-off move to multi-shop (SaaS). Usage: npm run migrate:shops   Safe to run more than once.
// - creates the first shop from the details that used to be in lib/shop.ts, if there is no shop yet
// - puts every existing user, order, menu item, table, section, ingredient, expense, category,
//   stock movement and daily entry in that shop
// - moves the order number counter to that shop, so codes carry on from where they were
// - drops the old indexes that made names, table numbers and order codes unique across the whole
//   database; the app builds the new per-shop ones ({ shop, … }) when it starts
import mongoose from 'mongoose'

const { MONGODB_URI } = process.env
if (!MONGODB_URI) {
  console.error('Set MONGODB_URI in .env.local first.')
  process.exit(1)
}

const TENANT_COLLECTIONS = ['users', 'orders', 'menuitems', 'tables', 'sections', 'ingredients', 'expenses', 'expensecategories', 'stockmovements', 'sectiondays']
// Old indexes that stay: sign-in looks users up by email across every shop.
const KEEP = { users: ['email_1'] }

await mongoose.connect(MONGODB_URI)
const db = mongoose.connection
console.log(`Database: ${db.name} on ${db.host}`)

const shops = db.collection('shops')
const existing = await shops.find().sort({ createdAt: 1 }).limit(2).toArray()
let shop = existing[0]
if (!shop) {
  const now = new Date()
  const doc = {
    name: 'বন্ধু মহল',
    tagline: 'টি-স্টল এন্ড রেস্টুরেন্ট',
    address: 'আমরাইদ বাজার, গিয়াসপুর রোড, কাপাসিয়া, গাজীপুর',
    phone: '',
    thanks: 'ধন্যবাদ! আবার আসবেন।',
    orderPrefix: 'BM',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }
  const { insertedId } = await shops.insertOne(doc)
  shop = { _id: insertedId, ...doc }
  console.log(`Created shop "${shop.name}" (${shop._id})`)
} else {
  console.log(`Using shop "${shop.name}" (${shop._id})`)
}

for (const name of TENANT_COLLECTIONS) {
  const collection = db.collection(name)
  const untagged = await collection.countDocuments({ shop: { $exists: false } })
  // With several shops it would be a guess which one old data belongs to.
  if (untagged > 0 && existing.length > 1) {
    console.error(`  ${name}: ${untagged} documents have no shop, but there are several shops. Tag them by hand.`)
    process.exitCode = 1
    continue
  }
  const { modifiedCount } = await collection.updateMany({ shop: { $exists: false } }, { $set: { shop: shop._id } })

  const dropped = []
  for (const index of await collection.indexes().catch(() => [])) {
    if (index.name === '_id_' || (KEEP[name] ?? []).includes(index.name) || Object.keys(index.key)[0] === 'shop') continue
    await collection.dropIndex(index.name)
    dropped.push(index.name)
  }
  console.log(`  ${name}: ${modifiedCount} moved into the shop${dropped.length ? `, dropped indexes ${dropped.join(', ')}` : ''}`)
}

// Order numbers: one counter per shop now.
const counters = db.collection('counters')
const old = await counters.findOne({ _id: 'order' })
if (old) {
  const key = `order:${shop._id}`
  const current = await counters.findOne({ _id: key })
  await counters.updateOne({ _id: key }, { $set: { seq: Math.max(old.seq ?? 0, current?.seq ?? 0) } }, { upsert: true })
  await counters.deleteOne({ _id: 'order' })
  console.log(`  counters: order numbers carry on from ${1000 + (old.seq ?? 0)}`)
}

await mongoose.disconnect()
console.log(process.exitCode ? 'Finished with problems, see above.' : 'Done. Start the app once so it builds the new per-shop indexes.')
