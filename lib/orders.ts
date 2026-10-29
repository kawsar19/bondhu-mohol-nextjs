import 'server-only'
import { isValidObjectId, type Types } from 'mongoose'
import { MenuItem } from './models/menu-item'
import { getT } from './i18n/server'
import { Counter, Order, ORDER_TYPES, PAYMENT_METHODS } from './models/order'
import { Table } from './models/table'

const MAX_LINES = 30
const MAX_QTY = 50

export class OrderInputError extends Error {}

async function nextOrderCode() {
  const counter = await Counter.findOneAndUpdate({ _id: 'order' }, { $inc: { seq: 1 } }, { upsert: true, new: true })
  return `BM-${1000 + counter.seq}`
}

type PricedItem = { menuItem: Types.ObjectId; name: string; price: number; qty: number; section?: Types.ObjectId | null }

/**
 * Turns [{ id, qty }] into priced order lines. Lines already on the order (`existing`) keep the
 * name, price and section they were ordered at; anything new is priced from the menu and must be available.
 */
export async function priceItems(rawItems: unknown, existing: PricedItem[] = []): Promise<PricedItem[]> {
  const t = await getT()
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new OrderInputError(t('orders.server.emptyOrder'))
  if (rawItems.length > MAX_LINES) throw new OrderInputError(t('orders.server.tooManyItems'))
  const wanted = new Map<string, number>()
  for (const line of rawItems as { id?: unknown; qty?: unknown }[]) {
    const qty = Number(line?.qty)
    if (typeof line?.id !== 'string' || !isValidObjectId(line.id) || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new OrderInputError(t('orders.server.invalidItems'))
    wanted.set(line.id, Math.min(MAX_QTY, (wanted.get(line.id) ?? 0) + qty))
  }

  const kept = new Map(existing.map(i => [i.menuItem.toString(), i]))
  const newIds = [...wanted.keys()].filter(id => !kept.has(id))
  const menuItems = newIds.length ? await MenuItem.find({ _id: { $in: newIds }, isAvailable: true }).lean() : []
  if (menuItems.length !== newIds.length) throw new OrderInputError(t('orders.server.unavailableItems'))
  const fresh = new Map(menuItems.map(m => [m._id.toString(), { menuItem: m._id, name: m.name, price: m.price, section: m.section ?? null }]))

  return [...wanted.entries()].map(([id, qty]) => {
    const base = kept.get(id) ?? fresh.get(id)!
    return { menuItem: base.menuItem, name: base.name, price: base.price, section: base.section ?? null, qty }
  })
}

export const orderTotal = (items: { price: number; qty: number }[]) => items.reduce((sum, i) => sum + i.price * i.qty, 0)

/**
 * Validates an order the manager entered, prices it from the database, and saves it.
 * With a `paymentMethod` it is saved as already paid; otherwise it waits in the unpaid list.
 */
export async function createOrder(body: unknown, staff: { name: string }) {
  const t = await getT()
  if (!body || typeof body !== 'object') throw new OrderInputError(t('orders.server.invalidOrder'))
  const raw = body as Record<string, unknown>

  const type = raw.type as (typeof ORDER_TYPES)[number]
  if (!ORDER_TYPES.includes(type as never)) throw new OrderInputError(t('orders.server.chooseType'))

  const items = await priceItems(raw.items)
  const total = orderTotal(items)

  const note = typeof raw.note === 'string' ? raw.note.trim().slice(0, 200) : ''
  const customerName = typeof raw.customerName === 'string' ? raw.customerName.trim().slice(0, 60) : ''

  // The table is optional; it only shows on the bill and groups a table's orders for one payment.
  let tableNumber: number | undefined
  if (type === 'Dine in' && raw.tableNumber != null && raw.tableNumber !== '') {
    tableNumber = Number(raw.tableNumber)
    if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 999) throw new OrderInputError(t('orders.server.invalidTable'))
    // If tables are set up in admin, only accept an active one.
    if (await Table.exists({})) {
      if (!(await Table.exists({ number: tableNumber, isActive: true }))) throw new OrderInputError(t('orders.server.tableUnavailable', { number: tableNumber }))
    }
  }

  let payment = {}
  if (raw.paymentMethod != null && raw.paymentMethod !== '') {
    if (!PAYMENT_METHODS.includes(raw.paymentMethod as never)) throw new OrderInputError(t('billing.api.chooseMethod'))
    payment = { paymentStatus: 'Paid', paymentMethod: raw.paymentMethod, paidAt: new Date() }
  }

  const order = await Order.create({ code: await nextOrderCode(), type, tableNumber, customerName, note, items, total, takenBy: staff.name, ...payment })
  return { id: order._id.toString(), code: order.code }
}
