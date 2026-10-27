'use client'

import { Banknote, CreditCard, Smartphone } from 'lucide-react'

export const PAYMENT_METHODS = ['Cash', 'bKash', 'Nagad', 'Card'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

const icons = { Cash: Banknote, bKash: Smartphone, Nagad: Smartphone, Card: CreditCard }
const tones: Record<PaymentMethod, string> = { Cash: 'hover:border-emerald-300 hover:bg-emerald-50', bKash: 'hover:border-pink-300 hover:bg-pink-50', Nagad: 'hover:border-orange-300 hover:bg-orange-50', Card: 'hover:border-blue-300 hover:bg-blue-50' }

/** One tap per method; used wherever an order or a table bill is marked paid. */
export function PaymentButtons({ onPick, disabled, size = 'md' }: { onPick: (method: PaymentMethod) => void; disabled?: boolean; size?: 'sm' | 'md' }) {
  return <div className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-4">{PAYMENT_METHODS.map(method => {
    const Icon = icons[method]
    return <button key={method} type="button" disabled={disabled} onClick={() => onPick(method)} className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-[#e2e7e1] bg-white font-bold text-[#2f3a33] shadow-sm transition active:scale-[.97] disabled:opacity-50 ${tones[method]} ${size === 'sm' ? 'h-14 text-xs' : 'h-16 text-sm'}`}><Icon className={size === 'sm' ? 'size-4' : 'size-5'} />{method}</button>
  })}</div>
}
