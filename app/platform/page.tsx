import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PlatformDashboard } from '@/components/platform/platform-dashboard'
import { getPlatformAdmin } from '@/lib/platform-auth'

export const metadata: Metadata = { title: 'Super admin', robots: { index: false } }

export default async function PlatformPage() {
  // proxy.ts redirects early; this is the real check.
  const admin = await getPlatformAdmin()
  if (!admin) redirect('/api/platform/logout')
  return <PlatformDashboard admin={{ name: admin.name, email: admin.email }} />
}
