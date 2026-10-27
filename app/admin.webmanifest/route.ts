import { SHOP } from '@/lib/shop'

// Install manifest for the staff dashboard only; the customer menu is not an app.
// Linked from app/admin/layout.tsx rather than app/manifest.ts, which would apply site-wide.
export function GET() {
  return Response.json(
    {
      id: '/admin',
      name: `${SHOP.name} Admin`,
      short_name: SHOP.name,
      description: 'Orders, kitchen, tables, menu and reports',
      start_url: '/admin',
      scope: '/admin',
      display: 'standalone',
      orientation: 'any',
      background_color: '#f7f8f6',
      theme_color: '#174d3c',
      lang: 'bn',
      icons: [
        { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/pwa/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' } },
  )
}
