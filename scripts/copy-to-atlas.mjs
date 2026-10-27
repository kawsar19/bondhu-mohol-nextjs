// Copies the shop setup (menu, tables, expense categories) from the local database to another one,
// e.g. MongoDB Atlas for a Vercel deployment. Orders, expenses and users are NOT copied:
// create the admin there with `seed:admin` instead.
// Usage: TARGET_MONGODB_URI="mongodb+srv://USER:PASS@cluster.../bondhu-mohol" npm run copy:atlas
// Safe to run again: documents are matched by _id and replaced, nothing else is deleted.
import mongoose from 'mongoose'

const COLLECTIONS = ['menuitems', 'tables', 'expensecategories']
const { MONGODB_URI, TARGET_MONGODB_URI } = process.env

if (!MONGODB_URI || !TARGET_MONGODB_URI) {
  console.error('Set TARGET_MONGODB_URI (MONGODB_URI comes from .env.local).')
  process.exit(1)
}
if (TARGET_MONGODB_URI === MONGODB_URI) {
  console.error('TARGET_MONGODB_URI is the same as the local database.')
  process.exit(1)
}

const source = await mongoose.createConnection(MONGODB_URI).asPromise()
const target = await mongoose.createConnection(TARGET_MONGODB_URI).asPromise()
// Without a database name in the URI, MongoDB silently uses "test".
if (target.name === 'test') {
  console.error('Add a database name to TARGET_MONGODB_URI, e.g. ...mongodb.net/bondhu-mohol?retryWrites=true&w=majority')
  process.exit(1)
}
console.log(`Copying ${source.name} → ${target.name} on ${target.host}`)

for (const name of COLLECTIONS) {
  const docs = await source.collection(name).find().toArray()
  if (docs.length === 0) {
    console.log(`  ${name}: nothing to copy`)
    continue
  }
  const result = await target.collection(name).bulkWrite(docs.map(doc => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } })))
  console.log(`  ${name}: ${docs.length} copied (${result.upsertedCount} new, ${result.modifiedCount} updated)`)
}

await Promise.all([source.close(), target.close()])
console.log('Done. Now create the admin there: MONGODB_URI="<same target uri>" npm run seed:admin')
