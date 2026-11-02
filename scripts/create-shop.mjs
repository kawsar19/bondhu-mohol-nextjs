// Adds a new restaurant with its first admin account.
// Usage: SHOP_NAME="Cafe Rio" ORDER_PREFIX=CR NEW_ADMIN_EMAIL=owner@cafe.com NEW_ADMIN_PASSWORD='…' npm run create:shop
//        (NEW_ADMIN_NAME is optional; MONGODB_URI comes from .env.local)
// The admin then signs in and sets up the menu, tables, sections and staff from the dashboard.
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

const { MONGODB_URI, SHOP_NAME, ORDER_PREFIX = 'ORD', NEW_ADMIN_NAME = 'Admin', NEW_ADMIN_EMAIL, NEW_ADMIN_PASSWORD } = process.env

const fail = message => {
  console.error(message)
  process.exit(1)
}
if (!MONGODB_URI) fail('Set MONGODB_URI in .env.local first.')
if (!SHOP_NAME?.trim()) fail('Set SHOP_NAME.')
if (!NEW_ADMIN_EMAIL?.trim() || !NEW_ADMIN_PASSWORD) fail('Set NEW_ADMIN_EMAIL and NEW_ADMIN_PASSWORD.')
if (NEW_ADMIN_PASSWORD.length < 8) fail('NEW_ADMIN_PASSWORD must be at least 8 characters.')
const prefix = ORDER_PREFIX.trim().toUpperCase()
if (!/^[A-Z0-9]{1,6}$/.test(prefix)) fail('ORDER_PREFIX must be 1 to 6 English letters or digits.')

await mongoose.connect(MONGODB_URI)
const db = mongoose.connection
const email = NEW_ADMIN_EMAIL.trim().toLowerCase()
// Emails are unique across every shop, since signing in uses the email alone.
if (await db.collection('users').findOne({ email })) fail(`${email} already has an account (in this or another shop).`)

const now = new Date()
const { insertedId: shopId } = await db.collection('shops').insertOne({ name: SHOP_NAME.trim(), tagline: '', address: '', phone: '', thanks: '', orderPrefix: prefix, isActive: true, createdAt: now, updatedAt: now })
await db.collection('users').insertOne({ shop: shopId, name: NEW_ADMIN_NAME.trim(), email, passwordHash: await bcrypt.hash(NEW_ADMIN_PASSWORD, 12), role: 'admin', isActive: true, sessionVersion: 0, createdAt: now, updatedAt: now })
await db.collection('users').createIndex({ email: 1 }, { unique: true })

console.log(`Created shop "${SHOP_NAME.trim()}" (SHOP_ID=${shopId}) with admin ${email}`)
await mongoose.disconnect()
