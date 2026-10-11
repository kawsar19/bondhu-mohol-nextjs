import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Table } from '@/lib/models/table'
import { isDuplicateKeyError, parseTableInput } from '@/lib/table-input'

type Context = { params: Promise<{ id: string }> }

const notFound = () => NextResponse.json({ error: 'Table not found' }, { status: 404 })

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

  const parsed = parseTableInput(await request.json().catch(() => null), true)
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await connectDB()
  try {
    const table = await Table.findByIdAndUpdate(id, parsed.data, { new: true, runValidators: true })
    return table ? NextResponse.json({ table }) : notFound()
  } catch (err) {
    if (isDuplicateKeyError(err)) return NextResponse.json({ error: `Table ${parsed.data.number} already exists` }, { status: 409 })
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
