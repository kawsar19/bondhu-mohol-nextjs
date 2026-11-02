import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { Order } from '@/lib/models/order'
import { Shop } from '@/lib/models/shop'
import { User } from '@/lib/models/user'
import { requirePlatformAdmin } from '@/lib/platform-auth'
import { parseNewShopInput } from '@/lib/platform-input'
import { isDuplicateKeyError } from '@/lib/table-input'
import { DAY_MS, startOfBusinessDay } from '@/lib/time'

type OrderStats = { _id: unknown; orders: number; sales: number; orders30: number; sales30: number; ordersToday: number; salesToday: number; lastOrderAt: Date | null }
type UserStats = { _id: unknown; staff: number; admins: { _id: unknown; name: string; email: string }[] }

// Super admin: every shop with its numbers, and platform-wide totals.
export async function GET() {
  const { error } = await requirePlatformAdmin()
  if (error) return error

  await connectDB()
  const shops = await Shop.find().sort({ createdAt: -1 }).lean()
  const ids = shops.map(s => s._id)
  const today = startOfBusinessDay()
  const since30 = new Date(today.getTime() - 29 * DAY_MS)
  const inWindow = (from: Date, value: unknown) => ({ $sum: { $cond: [{ $gte: ['$createdAt', from] }, value, 0] } })

  // Matching on the full list of shop ids keeps these inside the tenant guard (lib/models/tenant.ts).
  const [orderStats, userStats]: [OrderStats[], UserStats[]] = await Promise.all([
    Order.aggregate([
      { $match: { shop: { $in: ids }, status: { $ne: 'Cancelled' } } },
      { $group: { _id: '$shop', orders: { $sum: 1 }, sales: { $sum: '$total' }, orders30: inWindow(since30, 1), sales30: inWindow(since30, '$total'), ordersToday: inWindow(today, 1), salesToday: inWindow(today, '$total'), lastOrderAt: { $max: '$createdAt' } } },
    ]),
    User.aggregate([
      { $match: { shop: { $in: ids } } },
      { $sort: { createdAt: 1 } },
      { $group: { _id: '$shop', staff: { $sum: 1 }, admins: { $push: { $cond: [{ $eq: ['$role', 'admin'] }, { _id: '$_id', name: '$name', email: '$email' }, '$$REMOVE'] } } } },
    ]),
  ])
  const ordersOf = new Map(orderStats.map(o => [String(o._id), o]))
  const usersOf = new Map(userStats.map(u => [String(u._id), u]))

  const rows = shops.map(s => {
    const o = ordersOf.get(String(s._id))
    const u = usersOf.get(String(s._id))
    return {
      _id: String(s._id),
      name: s.name,
      orderPrefix: s.orderPrefix,
      address: s.address,
      isActive: s.isActive !== false,
      createdAt: s.createdAt,
      staff: u?.staff ?? 0,
      admins: (u?.admins ?? []).map(a => ({ _id: String(a._id), name: a.name, email: a.email })),
      orders: o?.orders ?? 0,
      sales: o?.sales ?? 0,
      orders30: o?.orders30 ?? 0,
      sales30: o?.sales30 ?? 0,
      ordersToday: o?.ordersToday ?? 0,
      salesToday: o?.salesToday ?? 0,
      lastOrderAt: o?.lastOrderAt ?? null,
    }
  })
  const sum = (key: 'ordersToday' | 'salesToday' | 'sales30' | 'staff') => rows.reduce((n, r) => n + r[key], 0)

  return NextResponse.json({
    totals: {
      shops: rows.length,
      active: rows.filter(r => r.isActive).length,
      inactive: rows.filter(r => !r.isActive).length,
      newLast30: rows.filter(r => r.createdAt && new Date(r.createdAt) >= since30).length,
      // A shop counts as in use if it entered an order in the last 30 days.
      inUse: rows.filter(r => r.orders30 > 0).length,
      staff: sum('staff'),
      ordersToday: sum('ordersToday'),
      salesToday: sum('salesToday'),
      sales30: sum('sales30'),
    },
    shops: rows,
  })
}

// Super admin: a new shop and its first admin, who then signs in and sets up everything else.
export async function POST(request: Request) {
  const { error } = await requirePlatformAdmin()
  if (error) return error

  const t = await getT()
  const parsed = parseNewShopInput(await request.json().catch(() => null), t)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { name, orderPrefix, adminName, adminEmail, adminPassword } = parsed.data

  await connectDB()
  // Emails are unique across every shop, since signing in uses the email alone.
  const emailTaken = () => NextResponse.json({ error: t('platform.api.emailTaken', { email: adminEmail }) }, { status: 409 })
  if (await User.findOne({ email: adminEmail }, '_id', { skipTenant: true }).lean()) return emailTaken()

  // Without a replica set there are no transactions, so the shop is removed by hand if the admin can't be saved.
  const shop = await Shop.create({ name, orderPrefix })
  try {
    await User.create({ shop: shop._id, name: adminName, email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 12), role: 'admin' })
  } catch (err) {
    await Shop.deleteOne({ _id: shop._id })
    if (isDuplicateKeyError(err)) return emailTaken()
    throw err
  }
  return NextResponse.json({ shop: { _id: String(shop._id), name: shop.name } }, { status: 201 })
}
