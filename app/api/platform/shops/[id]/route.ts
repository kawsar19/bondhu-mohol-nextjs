import bcrypt from 'bcryptjs'
import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { Shop } from '@/lib/models/shop'
import { User } from '@/lib/models/user'
import { requirePlatformAdmin } from '@/lib/platform-auth'
import { parseShopChanges } from '@/lib/platform-input'

type Context = { params: Promise<{ id: string }> }

// Super admin: rename a shop, change its order prefix, switch it on or off, or reset one of its admins' passwords.
// Switching a shop off signs its staff out on their next request (lib/auth.ts checks it every time).
export async function PATCH(request: Request, { params }: Context) {
  const { error } = await requirePlatformAdmin()
  if (error) return error
  const t = await getT()
  const { id } = await params
  const notFound = () => NextResponse.json({ error: t('settings.api.notFound') }, { status: 404 })
  if (!isValidObjectId(id)) return notFound()

  const parsed = parseShopChanges(await request.json().catch(() => null), t)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { resetAdmin, ...fields } = parsed.data

  await connectDB()
  const shop = await Shop.findById(id)
  if (!shop) return notFound()

  if (resetAdmin) {
    if (!isValidObjectId(resetAdmin.userId)) return NextResponse.json({ error: t('staff.errors.notFound') }, { status: 404 })
    const admin = await User.findOne({ _id: resetAdmin.userId, shop: shop._id, role: 'admin' })
    if (!admin) return NextResponse.json({ error: t('staff.errors.notFound') }, { status: 404 })
    admin.passwordHash = await bcrypt.hash(resetAdmin.password, 12)
    // Signs them out everywhere, as a staff password reset does.
    admin.sessionVersion = (admin.sessionVersion ?? 0) + 1
    admin.isActive = true
    await admin.save()
  }

  if (Object.keys(fields).length) {
    shop.set(fields)
    await shop.save()
  }
  return NextResponse.json({ shop: { _id: String(shop._id), name: shop.name, orderPrefix: shop.orderPrefix, isActive: shop.isActive } })
}
