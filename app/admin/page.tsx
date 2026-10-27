import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/admin/dashboard'
import { getCurrentUser, getSession } from '@/lib/auth'

export default async function AdminPage() {
  // proxy.ts redirects early; this is the real check.
  if (!(await getSession())) redirect('/admin/login')
  const user = await getCurrentUser()
  if (!user) redirect('/api/auth/logout')

  return <AdminDashboard user={{ id: user.userId, name: user.name, email: user.email, role: user.role }} />
}
