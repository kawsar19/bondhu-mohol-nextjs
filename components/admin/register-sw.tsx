'use client'

import { useEffect } from 'react'

/** Registers the admin service worker. Skipped in development, where it would fight hot reload. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' }).catch(() => {})
  }, [])
  return null
}
