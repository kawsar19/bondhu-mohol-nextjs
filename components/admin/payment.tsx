'use client'

import { Banknote, CreditCard, Smartphone } from 'lucide-react'
import { useT } from '@/components/i18n-provider'
import type { TFunction } from '@/lib/i18n'

export const PAYMENT_METHODS = ['Cash', 'bKash', 'Nagad', 'Card'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

const icons = { Cash: Banknote, bKash: Smartphone, Nagad: Smartphone, Card: CreditCard }
const METHOD_KEY = { Cash: 'billing.method.Cash', bKash: 'billing.method.bKash', Nagad: 'billing.method.Nagad', Card: 'billing.method.Card' } as const
const tones: Record<PaymentMethod, string> = { Cash: 'hover:border-emerald-300 hover:bg-emerald-50', bKash: 'hover:border-pink-300 hover:bg-pink-50', Nagad: 'hover:border-orange-300 hover:bg-orange-50', Card: 'hover:border-blue-300 hover:bg-blue-50' }

/** Display name for a stored payment method; unknown values are shown as stored. */
export const methodLabel = (t: TFunction, method: string) => method in METHOD_KEY ? t(METHOD_KEY[method as PaymentMethod]) : method

/** One tap per method; used wherever an order or a table bill is marked paid. */
export function PaymentButtons({ onPick, disabled, size = 'md' }: { onPick: (method: PaymentMethod) => void; disabled?: boolean; size?: 'sm' | 'md' }) {
  const t = useT()
  return <div className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-4">{PAYMENT_METHODS.map(method => {
    const Icon = icons[method]
    return <button key={method} type="button" disabled={disabled} onClick={() => onPick(method)} className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-[#e2e7e1] bg-white font-bold text-[#2f3a33] shadow-sm transition active:scale-[.97] disabled:opacity-50 ${tones[method]} ${size === 'sm' ? 'h-14 text-xs' : 'h-16 text-sm'}`}><Icon className={size === 'sm' ? 'size-4' : 'size-5'} />{methodLabel(t, method)}</button>
  })}</div>
}
