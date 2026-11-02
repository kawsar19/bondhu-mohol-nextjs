import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/admin/dashboard'
import { getCurrentUser, getSession } from '@/lib/auth'
import { Shop } from '@/lib/models/shop'
import { SHOP_FIELDS, shopInfo } from '@/lib/shop'

export default async function AdminPage() {
  // proxy.ts redirects early; this is the real check.
  if (!(await getSession())) redirect('/admin/login')
  const user = await getCurrentUser()
  if (!user) redirect('/api/auth/logout')

  // getCurrentUser() already checked the shop exists and is switched on.
  const shop = await Shop.findById(user.shop).select(SHOP_FIELDS).lean()
  if (!shop) redirect('/api/auth/logout')

  return <AdminDashboard user={{ id: user.userId, name: user.name, email: user.email, role: user.role }} shop={shopInfo(shop)} />
}
