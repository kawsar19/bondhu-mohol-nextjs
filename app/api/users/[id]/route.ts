import bcrypt from 'bcryptjs'
import { isValidObjectId } from 'mongoose'
import { NextResponse } from 'next/server'
import { requireRole, setSessionCookie } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import type { TFunction } from '@/lib/i18n'
import { getT } from '@/lib/i18n/server'
import { User } from '@/lib/models/user'
import { hasOtherActiveAdmin, STAFF_FIELDS } from '@/lib/staff'
import { isDuplicateKeyError } from '@/lib/table-input'
import { parseUserInput } from '@/lib/user-input'

type Context = { params: Promise<{ id: string }> }

const notFound = (t: TFunction) => NextResponse.json({ error: t('staff.errors.notFound') }, { status: 404 })
const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 })

export async function PATCH(request: Request, { params }: Context) {
  const { session, error } = await requireRole(['admin'])
  if (error) return error
  const t = await getT()
  const { id } = await params
  if (!isValidObjectId(id)) return notFound(t)

  const parsed = parseUserInput(t, await request.json().catch(() => null), true)
  if (!parsed.data) return badRequest(parsed.error)
  const { password, ...fields } = parsed.data
  const isSelf = id === session.userId
  if (isSelf && fields.role !== undefined && fields.role !== 'admin') return badRequest(t('staff.errors.cantChangeOwnRole'))
  if (isSelf && fields.isActive === false) return badRequest(t('staff.errors.cantDisableOwn'))

  await connectDB()
  const user = await User.findById(id)
  if (!user) return notFound(t)
  const losesAdmin = user.role === 'admin' && ((fields.role !== undefined && fields.role !== 'admin') || fields.isActive === false)
  if (losesAdmin && !(await hasOtherActiveAdmin(id))) return badRequest(t('staff.errors.keepOneAdmin'))

  user.set(fields)
  if (password) user.passwordHash = await bcrypt.hash(password, 12)
  // Sign the person out on every device after a password reset or disable.
  if (password || fields.isActive === false) user.sessionVersion = (user.sessionVersion ?? 0) + 1
  try {
    await user.save()
  } catch (err) {
    if (isDuplicateKeyError(err)) return NextResponse.json({ error: t('staff.errors.emailTaken', { email: fields.email ?? '' }) }, { status: 409 })
    throw err
  }

  // Keep the admin who changed their own password signed in here.
  if (isSelf) await setSessionCookie({ userId: id, name: user.name, email: user.email, role: user.role ?? 'admin', sv: user.sessionVersion ?? 0 })
  return NextResponse.json({ user: await User.findById(id).select(STAFF_FIELDS) })
}

export async function DELETE(_request: Request, { params }: Context) {
  const { session, error } = await requireRole(['admin'])
  if (error) return error
  const t = await getT()
  const { id } = await params
  if (!isValidObjectId(id)) return notFound(t)
  if (id === session.userId) return badRequest(t('staff.errors.cantDeleteOwn'))

  await connectDB()
  const user = await User.findById(id).select('role isActive')
  if (!user) return notFound(t)
  if (user.role === 'admin' && user.isActive !== false && !(await hasOtherActiveAdmin(id))) return badRequest(t('staff.errors.keepOneAdmin'))
  await user.deleteOne()
  return NextResponse.json({ ok: true })
}
