import type { Metadata } from 'next'
import { catalogCredits } from '@/lib/ingredient-catalog'

export const metadata: Metadata = { title: 'Photo credits' }

// Ingredient photos come from Wikimedia Commons under free licences; most of those ask for credit.
export default function CreditsPage() {
  const credits = catalogCredits()
  return <main className="mx-auto max-w-3xl px-4 py-10 text-[#202521]">
    <h1 className="font-serif text-2xl font-bold">Photo credits · ছবির সূত্র</h1>
    <p className="mt-2 text-sm text-[#68756b]">The ingredient photos are from Wikimedia Commons and are used under the licence shown for each one. They are shown smaller than the originals.</p>
    <ul className="mt-6 divide-y divide-[#eceee9] rounded-2xl border border-[#e3e8e1] bg-white">
      {credits.map(c => <li key={c.image} className="flex items-center gap-3 px-4 py-2.5 text-xs">
        <img src={c.image} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{c.name} <span className="font-normal text-[#89938b]">· {c.nameEn}</span></p>
          <p className="truncate text-[#68756b]"><a href={c.source} className="underline" target="_blank" rel="noreferrer">{c.file.replace(/^File:/, '')}</a> · {c.artist} · {c.licenseUrl ? <a href={c.licenseUrl} className="underline" target="_blank" rel="noreferrer">{c.license}</a> : c.license}</p>
        </div>
      </li>)}
    </ul>
  </main>
}
