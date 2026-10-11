import 'server-only'
import { randomBytes } from 'node:crypto'
import { isValidObjectId } from 'mongoose'
import { MenuItem } from './models/menu-item'
import { Counter, OPEN_STATUSES, Order, ORDER_TYPES } from './models/order'
import { Table } from './models/table'

const MAX_LINES = 30
const MAX_QTY = 50

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

/** Validates a customer order, prices it from the database, and saves it. */
export async function createCustomerOrder(body: unknown) {
  if (!body || typeof body !== 'object') throw new OrderInputError('Invalid order')
  const raw = body as Record<string, unknown>

  const type = raw.type as (typeof ORDER_TYPES)[number]
  if (!ORDER_TYPES.includes(type as never)) throw new OrderInputError('Choose dine in or takeaway')

  if (!Array.isArray(raw.items) || raw.items.length === 0) throw new OrderInputError('Your order is empty')
  if (raw.items.length > MAX_LINES) throw new OrderInputError('Too many items in one order')
  const wanted = new Map<string, number>()
  for (const line of raw.items as { id?: unknown; qty?: unknown }[]) {
    const qty = Number(line?.qty)
    if (typeof line?.id !== 'string' || !isValidObjectId(line.id) || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new OrderInputError('Some items in your order are invalid')
    wanted.set(line.id, Math.min(MAX_QTY, (wanted.get(line.id) ?? 0) + qty))
  }

  const menuItems = await MenuItem.find({ _id: { $in: [...wanted.keys()] }, isAvailable: true }).lean()
  if (menuItems.length !== wanted.size) throw new OrderInputError('Some items are no longer available. Please check your order.')
  const items = menuItems.map(m => ({ menuItem: m._id, name: m.name, price: m.price, qty: wanted.get(m._id.toString())! }))
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)

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
    const normalized = normalizePhone(typeof raw.phone === 'string' ? raw.phone : '')
    if (!normalized) throw new OrderInputError('Enter a valid mobile number, e.g. 01712345678')
    phone = normalized
  }

  const trackingToken = randomBytes(16).toString('hex')
  const order = await Order.create({ code: await nextOrderCode(), type, tableNumber, customerName, phone, note, items, total, trackingToken })
  if (tableNumber) await Table.updateOne({ number: tableNumber }, { status: 'Occupied' })

  return { id: order._id.toString(), code: order.code, trackingToken }
}

/** Frees a table once it has no open orders left. */
export async function releaseTableIfIdle(tableNumber: number | null | undefined) {
  if (!tableNumber) return
  const open = await Order.exists({ tableNumber, status: { $in: OPEN_STATUSES } })
  if (!open) await Table.updateOne({ number: tableNumber, status: 'Occupied' }, { status: 'Available' })
}
