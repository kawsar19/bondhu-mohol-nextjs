// Adds a starter menu (restaurant + tea stall) when the menu is empty.
// Usage: npm run seed:menu   (reads MONGODB_URI from .env.local)
import mongoose from 'mongoose'

const { MONGODB_URI } = process.env
if (!MONGODB_URI) {
  console.error('Set MONGODB_URI in .env.local first.')
  process.exit(1)
}

const img = id => `https://images.unsplash.com/${id}?w=700&q=85`
const items = [
  { name: 'Kacchi Biryani', description: 'Fragrant basmati rice with tender mutton', category: 'Biryani', section: 'Restaurant', price: 320, image: img('photo-1565557623262-b51c2513a641'), isPopular: true },
  { name: 'Butter Chicken', description: 'Creamy tomato curry with roasted chicken', category: 'Chicken', section: 'Restaurant', price: 280, image: img('photo-1603894584373-5ac82b2ae398'), isPopular: true },
  { name: 'Beef Kala Bhuna', description: 'Slow-cooked beef with aromatic spices', category: 'Beef', section: 'Restaurant', price: 360, image: img('photo-1544025162-d76694265947') },
  { name: 'Hilsa Curry', description: 'Traditional mustard hilsa curry', category: 'Fish', section: 'Restaurant', price: 420, image: img('photo-1519708227418-c8fd9a32b7a2') },
  { name: 'Borhani', description: 'Refreshing spiced yogurt drink', category: 'Drinks', section: 'Restaurant', price: 80, image: img('photo-1551024709-8f23befc6f87') },
  { name: 'Firni', description: 'Silky rice pudding with rose and pistachio', category: 'Desserts', section: 'Restaurant', price: 140, image: img('photo-1570197788417-0e82375c9371') },
  { name: 'Dudh Cha', description: 'Milk tea, brewed strong', category: 'Tea', section: 'Tea stall', price: 15, isPopular: true },
  { name: 'Lal Cha', description: 'Black tea with a hint of lemon', category: 'Tea', section: 'Tea stall', price: 10 },
  { name: 'Malai Cha', description: 'Milk tea topped with fresh malai', category: 'Tea', section: 'Tea stall', price: 30, isPopular: true },
  { name: 'Coffee', description: 'Hot milk coffee', category: 'Coffee', section: 'Tea stall', price: 40 },
  { name: 'Singara', description: 'Crispy pastry with spiced potato', category: 'Snacks', section: 'Tea stall', price: 10 },
  { name: 'Puri', description: 'Fried lentil puri', category: 'Snacks', section: 'Tea stall', price: 10 },
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
