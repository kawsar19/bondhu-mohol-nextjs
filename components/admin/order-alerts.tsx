'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, BellOff, BellRing, X } from 'lucide-react'

type AlertOrder = { id: string; code: string; type: 'Dine in' | 'Takeaway'; tableNumber: number | null; customerName: string; total: number; source: string; takenBy: string }

const POLL_MS = 8000
// Ring again while new orders are still unseen, so nothing sits waiting.
const REMIND_MS = 45000
const SOUND_KEY = 'bm_order_sound'

const where = (o: AlertOrder) => o.type === 'Dine in' ? `Table ${o.tableNumber}` : o.customerName || 'Takeaway'

/** A short two-note chime made with Web Audio, so no sound file is needed. */
function playChime(ctx: AudioContext) {
  const start = ctx.currentTime
  ;[[880, 0], [1320, 0.18], [880, 0.6], [1320, 0.78]].forEach(([freq, at]) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, start + at)
    gain.gain.exponentialRampToValueAtTime(0.5, start + at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.45)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start + at)
    osc.stop(start + at + 0.5)
  })
}

export function OrderAlerts({ userName, ordersOpen, onOpenOrders }: { userName: string; ordersOpen: boolean; onOpenOrders: () => void }) {
  const [soundOn, setSoundOn] = useState(true)
  const [audioReady, setAudioReady] = useState(false)
  const [unseen, setUnseen] = useState<AlertOrder[]>([])
  const ctxRef = useRef<AudioContext | null>(null)
  const sinceRef = useRef<string | null>(null)
  const soundOnRef = useRef(true)

  useEffect(() => {
    try { if (localStorage.getItem(SOUND_KEY) === 'off') { setSoundOn(false); soundOnRef.current = false } } catch { /* storage blocked */ }
  }, [])

  // Browsers only allow sound after the person has tapped the page once.
  const unlockAudio = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctxRef.current ??= new AudioCtx()
      ctxRef.current.resume().then(() => setAudioReady(ctxRef.current?.state === 'running')).catch(() => {})
    } catch { /* no audio support */ }
  }, [])
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio)
    window.addEventListener('keydown', unlockAudio)
    return () => { window.removeEventListener('pointerdown', unlockAudio); window.removeEventListener('keydown', unlockAudio) }
  }, [unlockAudio])

  const ring = useCallback(() => {
    if (soundOnRef.current && ctxRef.current?.state === 'running') playChime(ctxRef.current)
  }, [])

  // Poll for orders placed since the last check. Orders this person took themselves don't ring.
  useEffect(() => {
    let stopped = false
    const tick = async () => {
      try {
        const since = sinceRef.current
        const res = await fetch(since ? `/api/orders/alerts?since=${encodeURIComponent(since)}` : '/api/orders/alerts', { cache: 'no-store' })
        if (!res.ok || stopped) return
        const data: { now: string; orders: AlertOrder[] } = await res.json()
        sinceRef.current = data.now
        const fresh = since ? data.orders.filter(o => !(o.source === 'Staff' && o.takenBy === userName)) : []
        if (fresh.length === 0) return
        setUnseen(current => [...current, ...fresh])
        ring()
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(fresh.length === 1 ? `New order ${fresh[0].code}` : `${fresh.length} new orders`, { body: fresh.map(o => `${o.code} · ${where(o)}`).join('\n') })
        }
      } catch { /* offline: try again next tick */ }
    }
    tick()
    const timer = setInterval(tick, POLL_MS)
    return () => { stopped = true; clearInterval(timer) }
  }, [userName, ring])

  useEffect(() => {
    if (unseen.length === 0 || ordersOpen) return
    const timer = setInterval(ring, REMIND_MS)
    return () => clearInterval(timer)
  }, [unseen.length, ordersOpen, ring])

  // Show the count in the browser tab so it's visible from other tabs too.
  useEffect(() => {
    if (unseen.length === 0) return
    const original = document.title
    document.title = `(${unseen.length}) New order · Bondhu Mohol`
    return () => { document.title = original }
  }, [unseen.length])

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    soundOnRef.current = next
    try { localStorage.setItem(SOUND_KEY, next ? 'on' : 'off') } catch { /* storage blocked */ }
    if (next) {
      unlockAudio()
      setTimeout(ring, 150)
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {})
    }
  }

  const view = () => { setUnseen([]); onOpenOrders() }
  const BellIcon = !soundOn ? BellOff : unseen.length ? BellRing : Bell

  return <>
    <button onClick={toggleSound} aria-label={soundOn ? 'Turn off new-order sound' : 'Turn on new-order sound'} title={soundOn ? 'New-order sound is on' : 'New-order sound is off'} className={`relative flex size-9 items-center justify-center rounded-full border bg-white ${soundOn ? 'border-[#e0e5df] text-[#174d3c]' : 'border-[#f0d9cf] text-[#b4472c]'}`}>
      <BellIcon className={`size-4 ${unseen.length ? 'animate-pulse' : ''}`} />
      {unseen.length > 0 && <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#c96b42] text-[10px] font-bold text-white">{unseen.length}</span>}
    </button>

    {unseen.length > 0 && <div role="alert" className="fixed right-4 top-20 z-50 w-[min(360px,calc(100vw-2rem))] rounded-2xl bg-[#174d3c] p-4 text-white shadow-2xl">
      <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15"><BellRing className="size-5" /></span><div className="min-w-0 flex-1"><p className="font-semibold">{unseen.length === 1 ? 'New order' : `${unseen.length} new orders`}</p><ul className="mt-1 space-y-0.5 text-xs text-white/80">{unseen.slice(-3).map(o => <li key={o.id} className="truncate">{o.code} · {where(o)} · ৳ {o.total.toLocaleString('en-IN')}</li>)}</ul></div><button onClick={() => setUnseen([])} aria-label="Dismiss" className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"><X className="size-4" /></button></div>
      <button onClick={view} className="mt-3 h-10 w-full rounded-xl bg-white text-sm font-bold text-[#174d3c]">View orders</button>
    </div>}

    {soundOn && !audioReady && <button onClick={unlockAudio} className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#fff6e6] px-4 py-2.5 text-xs font-semibold text-[#946013] shadow-lg ring-1 ring-[#f1dcae]"><Bell className="size-4" /> Tap here to turn on the new-order sound</button>}
  </>
}
