'use client'

import { useState } from 'react'
import { Loader2, Printer, X } from 'lucide-react'
import { PaymentButtons, type PaymentMethod } from './payment'
import type { ReceiptOrder } from './receipt'

type BillOrder = { _id: string; code: string; tableNumber?: number; items: { menuItem?: string; name: string; price: number; qty: number }[]; total: number; status: string; createdAt: string }

const taka = (n: number) => `৳ ${n.toLocaleString('en-IN')}`

/** Same item at the same price is shown once, however many orders it came in. */
export function combineOrders(orders: BillOrder[], paymentMethod?: string): ReceiptOrder {
  const lines = new Map<string, { name: string; price: number; qty: number }>()
  for (const item of orders.flatMap(o => o.items)) {
    const key = `${item.name}|${item.price}`
    const line = lines.get(key)
    lines.set(key, line ? { ...line, qty: line.qty + item.qty } : { name: item.name, price: item.price, qty: item.qty })
  }
  return {
    code: orders.map(o => o.code).join(' + '),
    type: 'Dine in',
    tableNumber: orders[0]?.tableNumber,
    customerName: '',
    phone: '',
    items: [...lines.values()],
    total: orders.reduce((sum, o) => sum + o.total, 0),
    paymentStatus: paymentMethod ? 'Paid' : 'Unpaid',
    paymentMethod,
    createdAt: orders.map(o => o.createdAt).sort().at(-1) ?? new Date().toISOString(),
  }
}

/** Everything a table still owes, paid in one go. */
export function TableBill({ table, orders, onClose, onPrint, onSettled }: { table: number; orders: BillOrder[]; onClose: () => void; onPrint: (receipt: ReceiptOrder) => void; onSettled: (updated: unknown[]) => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const bill = combineOrders(orders)
  const notServed = orders.filter(o => ['Pending', 'Preparing'].includes(o.status))

  const settle = async (method: PaymentMethod) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/orders/settle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIds: orders.map(o => o._id), paymentMethod: method }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not take the payment')
      onPrint(combineOrders(orders, method))
      onSettled(data.orders)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not take the payment')
      setSaving(false)
    }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#202521]/30 sm:items-center sm:p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={`Bill for table ${table}`} onClick={e => e.stopPropagation()} className="flex max-h-[94dvh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
      <div className="flex items-center justify-between p-6 pb-3"><div><p className="text-xs uppercase tracking-[.16em] text-[#b86f3c]">Table bill</p><h3 className="mt-1 font-serif text-2xl font-bold">Table {table}</h3><p className="mt-0.5 text-[11px] text-[#89938b]">{orders.length} {orders.length === 1 ? 'order' : 'orders'}: {orders.map(o => o.code).join(', ')}</p></div><button aria-label="Close" onClick={onClose} className="self-start rounded-full p-2 hover:bg-[#f2f4f0]"><X className="size-5" /></button></div>
      <ul className="flex-1 divide-y divide-[#f0f2ef] overflow-y-auto px-6 text-sm">{bill.items.map(i => <li key={`${i.name}|${i.price}`} className="flex justify-between gap-3 py-2"><span><span className="font-bold">{i.qty}×</span> {i.name}</span><span className="text-[#5f6b62]">{taka(i.price * i.qty)}</span></li>)}</ul>
      <div className="border-t border-[#eef1ed] p-6 pt-4">
        <div className="flex items-baseline justify-between"><span className="text-sm text-[#68756b]">Total</span><span className="font-serif text-3xl font-bold">{taka(bill.total)}</span></div>
        {notServed.length > 0 && <p className="mt-2 rounded-lg bg-[#fff6e8] px-3 py-2 text-[11px] text-[#8a5a24]">{notServed.map(o => o.code).join(', ')} {notServed.length === 1 ? 'is' : 'are'} still in the kitchen. {notServed.length === 1 ? 'It' : 'They'} will be marked paid but stay open until served.</p>}
        {error && <p role="alert" className="mt-3 rounded-lg bg-[#fdf0ec] px-3 py-2 text-xs font-medium text-[#b4472c]">{error}</p>}
        <button onClick={() => onPrint(bill)} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e2e7e1] text-sm font-semibold text-[#5f6b62] hover:bg-[#f5f7f4]"><Printer className="size-4" /> Print bill first</button>
        <p className="mb-2 mt-4 flex items-center gap-2 text-xs font-semibold text-[#5f6b62]">Paid with {saving && <Loader2 className="size-3.5 animate-spin" />}</p>
        <PaymentButtons onPick={settle} disabled={saving} />
        <p className="mt-2 text-center text-[11px] text-[#9aa39c]">Marks every order paid, closes the served ones and prints the receipt.</p>
      </div>
    </div>
  </div>
}
