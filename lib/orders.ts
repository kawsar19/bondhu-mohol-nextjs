import 'server-only'
import { randomBytes } from 'node:crypto'
import { isValidObjectId, type Types } from 'mongoose'
import { MenuItem } from './models/menu-item'
import { Counter, OPEN_STATUSES, Order, ORDER_TYPES } from './models/order'
import { Table } from './models/table'

const MAX_LINES = 30
const MAX_QTY = 50
// Guest orders still waiting for the kitchen, per table or phone. Stops one person flooding
// the kitchen; staff can still add orders, and accepting one frees a slot.
const MAX_PENDING_GUEST_ORDERS = 3

export class OrderInputError extends Error {}

/** Bangladeshi mobile number, returned as 01XXXXXXXXX. */
export function normalizePhone(raw: string) {
  const digits = raw.replace(/[\s-]/g, '').replace(/^\+?88/, '')
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null
}

async function nextOrderCode() {
  const counter = await Counter.findOneAndUpdate({ _id: 'order' }, { $inc: { seq: 1 } }, { upsert: true, new: true })
  return `BM-${1000 + counter.seq}`
}

type PricedItem = { menuItem: Types.ObjectId; name: string; price: number; qty: number }

/**
 * Turns [{ id, qty }] into priced order lines. Lines already on the order (`existing`) keep the
 * name and price they were ordered at; anything new is priced from the menu and must be available.
 */
export async function priceItems(rawItems: unknown, existing: PricedItem[] = []): Promise<PricedItem[]> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new OrderInputError('The order is empty')
  if (rawItems.length > MAX_LINES) throw new OrderInputError('Too many items in one order')
  const wanted = new Map<string, number>()
  for (const line of rawItems as { id?: unknown; qty?: unknown }[]) {
    const qty = Number(line?.qty)
    if (typeof line?.id !== 'string' || !isValidObjectId(line.id) || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new OrderInputError('Some items in the order are invalid')
    wanted.set(line.id, Math.min(MAX_QTY, (wanted.get(line.id) ?? 0) + qty))
  }

  const kept = new Map(existing.map(i => [i.menuItem.toString(), i]))
  const newIds = [...wanted.keys()].filter(id => !kept.has(id))
  const menuItems = newIds.length ? await MenuItem.find({ _id: { $in: newIds }, isAvailable: true }).lean() : []
  if (menuItems.length !== newIds.length) throw new OrderInputError('Some items are no longer available. Please check the order.')
  const fresh = new Map(menuItems.map(m => [m._id.toString(), { menuItem: m._id, name: m.name, price: m.price }]))

  return [...wanted.entries()].map(([id, qty]) => {
    const base = kept.get(id) ?? fresh.get(id)!
    return { menuItem: base.menuItem, name: base.name, price: base.price, qty }
  })
}

export const orderTotal = (items: { price: number; qty: number }[]) => items.reduce((sum, i) => sum + i.price * i.qty, 0)

/**
 * Validates an order, prices it from the database, and saves it.
 * Pass `staff` when a waiter places it for a guest; the phone number is then optional for takeaway.
 */
export async function createOrder(body: unknown, staff?: { name: string }) {
  if (!body || typeof body !== 'object') throw new OrderInputError('Invalid order')
  const raw = body as Record<string, unknown>

  const type = raw.type as (typeof ORDER_TYPES)[number]
  if (!ORDER_TYPES.includes(type as never)) throw new OrderInputError('Choose dine in or takeaway')

  const items = await priceItems(raw.items)
  const total = orderTotal(items)

  const note = typeof raw.note === 'string' ? raw.note.trim().slice(0, 200) : ''
  const customerName = typeof raw.customerName === 'string' ? raw.customerName.trim().slice(0, 60) : ''
  let tableNumber: number | undefined
  let phone = ''

  if (type === 'Dine in') {
    tableNumber = Number(raw.tableNumber)
    if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 999) throw new OrderInputError('Choose your table number')
    // If tables are set up in admin, only accept an active one.
    if (await Table.exists({})) {
      if (!(await Table.exists({ number: tableNumber, isActive: true }))) throw new OrderInputError(`Table ${tableNumber} is not available. Please ask a staff member.`)
    }
  } else {
    const rawPhone = typeof raw.phone === 'string' ? raw.phone.trim() : ''
    if (rawPhone || !staff) {
      const normalized = normalizePhone(rawPhone)
      if (!normalized) throw new OrderInputError('Enter a valid mobile number, e.g. 01712345678')
      phone = normalized
    }
  }

  if (!staff) {
    const sameGuest = tableNumber ? { tableNumber } : { phone }
    const pending = await Order.countDocuments({ ...sameGuest, source: 'Customer', status: 'Pending' })
    if (pending >= MAX_PENDING_GUEST_ORDERS) throw new OrderInputError(`${tableNumber ? `Table ${tableNumber}` : 'This number'} already has ${pending} orders waiting for the kitchen. Please wait a moment or ask a staff member.`)
  }

  const trackingToken = randomBytes(16).toString('hex')
  const order = await Order.create({ code: await nextOrderCode(), type, tableNumber, customerName, phone, note, items, total, trackingToken, source: staff ? 'Staff' : 'Customer', takenBy: staff?.name ?? '' })
  if (tableNumber) await Table.updateOne({ number: tableNumber }, { status: 'Occupied' })

  return { id: order._id.toString(), code: order.code, trackingToken }
}

/** Frees a table once it has no open orders left. */
export async function releaseTableIfIdle(tableNumber: number | null | undefined) {
  if (!tableNumber) return
  const open = await Order.exists({ tableNumber, status: { $in: OPEN_STATUSES } })
  if (!open) await Table.updateOne({ number: tableNumber, status: 'Occupied' }, { status: 'Available' })
}
