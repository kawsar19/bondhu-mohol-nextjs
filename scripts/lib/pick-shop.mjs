import mongoose from 'mongoose'

// The shop a seed script works on: SHOP_ID if given, otherwise the only shop in the database.
export async function pickShop(db) {
  const { SHOP_ID } = process.env
  const shops = db.collection('shops')
  if (SHOP_ID) {
    const { ObjectId } = mongoose.Types
    const shop = ObjectId.isValid(SHOP_ID) ? await shops.findOne({ _id: new ObjectId(SHOP_ID) }) : null
    if (!shop) throw new Error(`No shop with SHOP_ID=${SHOP_ID}`)
    return shop
  }
  const all = await shops.find().limit(2).toArray()
  if (all.length === 0) throw new Error('No shop yet. Run `npm run migrate:shops` (existing data) or `npm run create:shop` (new shop) first.')
  if (all.length > 1) throw new Error('There is more than one shop. Set SHOP_ID to choose one (ids are printed by create:shop).')
  return all[0]
}
