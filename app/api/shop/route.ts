import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { Shop } from '@/lib/models/shop'
import { MANAGERS } from '@/lib/permissions'
import { SHOP_FIELDS, shopInfo } from '@/lib/shop'
import { parseShopInput } from '@/lib/shop-input'

// The signed-in user's own shop: name, address and the rest printed on receipts.
export async function GET() {
  const { session, error } = await requireRole(MANAGERS)
  if (error) return error

  await connectDB()
  const shop = await Shop.findById(session.shop).select(SHOP_FIELDS).lean()
  return shop ? NextResponse.json({ shop: shopInfo(shop) }) : NextResponse.json({ error: (await getT())('settings.api.notFound') }, { status: 404 })
}

// Admin only. A new order prefix applies to orders entered from now on; old codes stay as they were.
export async function PATCH(request: Request) {
  const { session, error } = await requireRole(['admin'])
  if (error) return error

  const t = await getT()
  const parsed = parseShopInput(await request.json().catch(() => null), t)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  const shop = await Shop.findByIdAndUpdate(session.shop, parsed.data, { new: true, runValidators: true }).select(SHOP_FIELDS).lean()
  return shop ? NextResponse.json({ shop: shopInfo(shop) }) : NextResponse.json({ error: t('settings.api.notFound') }, { status: 404 })
}
