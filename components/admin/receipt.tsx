'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useIntlLocale, useT } from '@/components/i18n-provider'
import { SHOP } from '@/lib/shop'
import { methodLabel } from './payment'

export type ReceiptOrder = { code: string; type: 'Dine in' | 'Takeaway'; tableNumber?: number; customerName: string; phone: string; items: { name: string; price: number; qty: number }[]; total: number; paymentStatus: 'Unpaid' | 'Paid'; paymentMethod?: string; createdAt: string }

const taka = (n: number) => `৳${n.toLocaleString('en-IN')}`

/** Prints one receipt sized for an 80mm thermal printer, then calls `onDone`. `onDone` must be stable. */
export function PrintReceipt({ order, onDone }: { order: ReceiptOrder; onDone: () => void }) {
  useEffect(() => {
    window.addEventListener('afterprint', onDone, { once: true })
    const timer = setTimeout(() => window.print(), 50)
    return () => { clearTimeout(timer); window.removeEventListener('afterprint', onDone) }
  }, [onDone])

  return createPortal(<div className="print-root hidden print:block">
    <style>{'@page { size: 80mm auto; margin: 3mm; }'}</style>
    <Receipt order={order} />
  </div>, document.body)
}

function Receipt({ order }: { order: ReceiptOrder }) {
  const t = useT()
  const intl = useIntlLocale()
  // Always Bangladesh time, whatever the printing computer is set to.
  const when = new Date(order.createdAt).toLocaleString(intl, { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
  const guest = order.type === 'Dine in' ? t('common.table', { number: order.tableNumber ?? '' }) : [order.customerName, order.phone].filter(Boolean).join(' · ') || t('common.orderType.Takeaway')

  return <div className="mx-auto w-[72mm] text-[10pt] leading-snug text-black">
    <div className="text-center"><p className="text-[16pt] font-bold leading-tight">{SHOP.name}</p><p className="text-[10pt] font-semibold">{SHOP.tagline}</p><p className="mt-[1mm] text-[8pt]">{SHOP.address}</p></div>
    <Rule />
    <Row label={t('billing.receipt.order')} value={<span className="font-bold">{order.code}</span>} />
    <Row label={t('billing.receipt.date')} value={when} />
    <Row label={t(order.type === 'Dine in' ? 'common.orderType.Dine in' : 'common.orderType.Takeaway')} value={guest} />
    <Rule />
    <table className="w-full border-collapse">
      <thead><tr className="text-left text-[9pt]"><th className="pb-[1mm] font-semibold">{t('billing.receipt.item')}</th><th className="pb-[1mm] text-center font-semibold">{t('billing.receipt.qty')}</th><th className="pb-[1mm] text-right font-semibold">{t('billing.receipt.amount')}</th></tr></thead>
      <tbody>{order.items.map(item => <tr key={item.name} className="align-top"><td className="py-[0.6mm] pr-[1mm]">{item.name}<div className="text-[8pt]">{t('billing.receipt.each', { price: taka(item.price) })}</div></td><td className="py-[0.6mm] text-center">{item.qty}</td><td className="py-[0.6mm] text-right">{taka(item.price * item.qty)}</td></tr>)}</tbody>
    </table>
    <Rule />
    <div className="flex justify-between text-[13pt] font-bold"><span>{t('billing.receipt.total')}</span><span>{taka(order.total)}</span></div>
    <p className="mt-[1.5mm] text-center text-[11pt] font-bold tracking-wider">{order.paymentStatus === 'Paid' ? `${t('billing.receipt.paid')}${order.paymentMethod ? ` · ${methodLabel(t, order.paymentMethod).toUpperCase()}` : ''}` : t('billing.receipt.unpaid')}</p>
    <Rule />
    <p className="text-center">{SHOP.thanks}</p>
  </div>
}

const Rule = () => <div className="my-[2mm] border-t border-dashed border-black" />

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-[2mm]"><span>{label}</span><span className="text-right">{value}</span></div>
}
