'use client'

import { createContext, useContext, useState } from 'react'
import type { ShopInfo } from '@/lib/shop'

type ShopContextValue = { shop: ShopInfo; setShop: (shop: ShopInfo) => void }

const ShopContext = createContext<ShopContextValue | null>(null)

/** The signed-in user's shop, for receipts and printed reports. Settings updates it after a save. */
export function ShopProvider({ initial, children }: { initial: ShopInfo; children: React.ReactNode }) {
  const [shop, setShop] = useState(initial)
  return <ShopContext.Provider value={{ shop, setShop }}>{children}</ShopContext.Provider>
}

export function useShop() {
  const value = useContext(ShopContext)
  if (!value) throw new Error('useShop() must be used inside <ShopProvider>')
  return value
}
