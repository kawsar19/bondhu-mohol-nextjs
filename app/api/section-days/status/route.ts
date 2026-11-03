import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { SectionDay } from '@/lib/models/section-day'
import { parseBusinessDate } from '@/lib/time'

// Which sections already have their entry for one day, so the screen can show what is left to do. ?date=YYYY-MM-DD
export async function GET(request: Request) {
  const { session, error } = await requireAdmin()
  if (error) return error

  const date = parseBusinessDate(new URL(request.url).searchParams.get('date'))
  if (!date) return NextResponse.json({ error: (await getT())('daily.api.invalidDate') }, { status: 400 })

  await connectDB()
  const days = await SectionDay.find({ shop: session.shop, date }).select('section enteredBy updatedAt').lean()
  return NextResponse.json({ saved: Object.fromEntries(days.map(d => [String(d.section), { enteredBy: d.enteredBy, updatedAt: d.updatedAt }])) })
}
