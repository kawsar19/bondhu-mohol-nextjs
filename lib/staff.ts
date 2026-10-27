import { User } from './models/user'

// Fields the staff screen needs; never the password hash.
export const STAFF_FIELDS = 'name email role isActive createdAt'

/** True when some active admin other than `exceptId` exists, so the shop is never left without one. */
export async function hasOtherActiveAdmin(exceptId: string) {
  return (await User.exists({ _id: { $ne: exceptId }, role: 'admin', isActive: { $ne: false } })) !== null
}
