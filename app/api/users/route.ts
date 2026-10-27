import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/lib/models/user'
import { STAFF_FIELDS } from '@/lib/staff'
import { isDuplicateKeyError } from '@/lib/table-input'
import { parseUserInput } from '@/lib/user-input'

// Admin only: staff accounts.
export async function GET() {
  const { error } = await requireRole(['admin'])
  if (error) return error

  await connectDB()
  const users = await User.find().select(STAFF_FIELDS).sort({ createdAt: 1 })
  return NextResponse.json({ users })
}

export async function POST(request: Request) {
  const { error } = await requireRole(['admin'])
  if (error) return error

  const parsed = parseUserInput(await request.json().catch(() => null))
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { password, ...fields } = parsed.data

  await connectDB()
  try {
    const created = await User.create({ ...fields, passwordHash: await bcrypt.hash(password!, 12) })
    const user = await User.findById(created._id).select(STAFF_FIELDS)
    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    if (isDuplicateKeyError(err)) return NextResponse.json({ error: `${fields.email} already has an account` }, { status: 409 })
    throw err
  }
}
