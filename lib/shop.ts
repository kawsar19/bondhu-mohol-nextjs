// Shared by server and client, so it must not import the database.

// Name of the product itself, for the installed app and browser tab. Each shop's own name comes from the database.
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Restaurant POS'

// What the dashboard needs about the signed-in user's shop: receipts and printed reports use it.
export type ShopInfo = { name: string; tagline: string; address: string; phone: string; thanks: string; orderPrefix: string }

export const SHOP_FIELDS = 'name tagline address phone thanks orderPrefix'

export function shopInfo(shop: Partial<Record<keyof ShopInfo, string | null>>): ShopInfo {
  return {
    name: shop.name ?? '',
    tagline: shop.tagline ?? '',
    address: shop.address ?? '',
    phone: shop.phone ?? '',
    thanks: shop.thanks ?? '',
    orderPrefix: shop.orderPrefix ?? 'ORD',
  }
}
