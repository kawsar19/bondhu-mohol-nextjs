// Adds the Bondhu Mohol menu when the menu is empty. Photos live in public/menu/.
// Usage: npm run seed:menu   (reads MONGODB_URI from .env.local)
import mongoose from 'mongoose'

const { MONGODB_URI } = process.env
if (!MONGODB_URI) {
  console.error('Set MONGODB_URI in .env.local first.')
  process.exit(1)
}

const TEA = 'চা ও বিশেষ আইটেম'
const FAST = 'ফাস্টফুড'
const LUNCH = 'দুপুরের স্পেশাল (প্যাকেজ)'
const DINNER = 'রাতের স্পেশাল'
const img = name => `/menu/${name}.jpg`

const items = [
  { name: 'গরুর দুধের চা', description: 'গাঢ় দুধের মজাদার চা', category: TEA, price: 25, image: img('cow-milk-tea'), isPopular: true },
  { name: 'পোড়া রুটি', description: 'নরম ও মজাদার পোড়া রুটি', category: TEA, price: 20, image: img('pora-ruti') },
  { name: 'মালাই চা', description: 'মালাইয়ের ঘ্রাণে দুধ চা', category: TEA, price: 35, image: img('malai-cha'), isPopular: true },
  { name: 'মালাই', description: 'তাজা ও ঘন মালাই', category: TEA, price: 30, image: img('malai') },
  { name: 'দুধ ডেনিশ', description: 'দুধে ভেজানো নরম ডেনিশ', category: TEA, price: 40, image: img('milk-danish') },
  { name: 'তেতুল চা / মরিচ চা', description: 'টক-মিষ্টি বা ঝাল-ঝাল চায়ের মজা', category: TEA, price: 25, image: img('tetul-cha') },
  { name: 'ঝালটক ফুসকা', description: 'ঝাল, টক আর মজায় ভরপুর', category: FAST, price: 60, image: img('jhaltok-fuchka'), isPopular: true },
  { name: 'দই ফুসকা', description: 'দই, মিষ্টি চাটনি আর মশলা', category: FAST, price: 70, image: img('doi-fuchka') },
  { name: 'ভেলপুরি', description: 'ঝাল-মিষ্টি মুখরোচক ভেলপুরি', category: FAST, price: 60, image: img('velpuri') },
  { name: 'চিকেন বার্গার', description: 'জুসি চিকেন, সস ও ভেজিটেবলসহ', category: FAST, price: 129, image: img('chicken-burger'), isPopular: true },
  { name: 'ভেজিটেবল রোলস', description: 'হেলদি ও টেস্টি ভেজ রোলস', category: FAST, price: 89, image: img('veg-roll') },
  { name: 'গরুর মাংস প্যাকেজ', description: 'করলা ভাজি + গরুর মাংস ভুনা + সাদা ভাত + মাসকলাই ডাল', category: LUNCH, price: 160, image: img('lunch-beef'), isPopular: true },
  { name: 'দেশী মুরগি প্যাকেজ', description: 'করলা ভাজি + দেশী মুরগি মাংস + সাদা ভাত + মাসকলাই ডাল', category: LUNCH, price: 150, image: img('lunch-chicken') },
  { name: 'রুমাল রুটি / পরোটা', description: 'নরম রুটি বা পরোটা', category: DINNER, price: 20, image: img('ruti-porota') },
  { name: 'গরুর মাংস ভুনা', description: 'ঝাল-মশলাদার গরুর মাংস ভুনা', category: DINNER, price: 150, image: img('beef-bhuna') },
  { name: 'দেশি মুরগি ভুনা', description: 'ঘরোয়া স্বাদে দেশি মুরগির ভুনা', category: DINNER, price: 150, image: img('deshi-murgi-bhuna') },
]

await mongoose.connect(MONGODB_URI)
const menu = mongoose.connection.collection('menuitems')
const existing = await menu.countDocuments()
if (existing > 0) {
  console.log(`Menu already has ${existing} items, nothing added.`)
} else {
  const now = new Date()
  await menu.insertMany(items.map(item => ({ description: '', image: '', isAvailable: true, isPopular: false, ...item, createdAt: now, updatedAt: now, __v: 0 })))
  console.log(`Added ${items.length} menu items.`)
}
await mongoose.disconnect()
