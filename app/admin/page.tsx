import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/admin/dashboard'
import { getSession } from '@/lib/auth'

export default async function AdminPage() {
  // proxy.ts redirects early; this is the real check.
  const session = await getSession()
  if (!session) redirect('/admin/login')

  return <AdminDashboard user={{ name: session.name, email: session.email, role: session.role }} />
}
