import type { Metadata, Viewport } from 'next'
import { RegisterServiceWorker } from '@/components/admin/register-sw'
import { SHOP } from '@/lib/shop'

// Makes the dashboard installable ("Add to Home Screen") as its own app.
export const metadata: Metadata = {
  manifest: '/admin.webmanifest',
  appleWebApp: { capable: true, title: SHOP.name, statusBarStyle: 'default' },
  icons: { apple: '/pwa/apple-touch-180.png' },
}

export const viewport: Viewport = {
  themeColor: '#174d3c',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>
    {children}
    <RegisterServiceWorker />
  </>
}
