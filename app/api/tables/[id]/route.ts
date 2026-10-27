import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Table } from '@/lib/models/table'
import { getT } from '@/lib/i18n/server'
import { isDuplicateKeyError, parseTableInput } from '@/lib/table-input'

type Context = { params: Promise<{ id: string }> }

const notFound = async () => NextResponse.json({ error: (await getT())('tables.api.notFound') }, { status: 404 })

export async function GET(_request: Request, { params }: Context) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  await connectDB()
  const table = await Table.findById(id)
  return table ? NextResponse.json({ table }) : notFound()
}

export async function PATCH(request: Request, { params }: Context) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  const t = await getT()
  const parsed = parseTableInput(await request.json().catch(() => null), t, true)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  try {
    const table = await Table.findByIdAndUpdate(id, parsed.data, { new: true, runValidators: true })
    return table ? NextResponse.json({ table }) : notFound()
  } catch (err) {
    if (isDuplicateKeyError(err)) return NextResponse.json({ error: t('tables.api.exists', { number: parsed.data.number ?? '' }) }, { status: 409 })
    throw err
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  if (!isValidObjectId(id)) return notFound()

  await connectDB()
  const table = await Table.findByIdAndDelete(id)
  return table ? NextResponse.json({ ok: true }) : notFound()
}
