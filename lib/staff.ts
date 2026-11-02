import type { Types } from 'mongoose'
import { User } from './models/user'

// Fields the staff screen needs; never the password hash.
export const STAFF_FIELDS = 'name email role isActive createdAt'

/** True when the shop has some active admin other than `exceptId`, so it is never left without one. */
export async function hasOtherActiveAdmin(shop: Types.ObjectId, exceptId: string) {
  return (await User.exists({ shop, _id: { $ne: exceptId }, role: 'admin', isActive: { $ne: false } })) !== null
}
