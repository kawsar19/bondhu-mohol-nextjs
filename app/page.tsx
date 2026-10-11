import { CustomerMenu, type PublicMenuItem, type PublicTable } from '@/components/customer/customer-menu'
import { connectDB } from '@/lib/db'
import { MenuItem } from '@/lib/models/menu-item'
import { Table } from '@/lib/models/table'

// Menu changes in the admin panel should show up immediately.
export const dynamic = 'force-dynamic'

export default async function Home({ searchParams }: { searchParams: Promise<{ table?: string }> }) {
  await connectDB()
  const [docs, tableDocs, params] = await Promise.all([
    MenuItem.find({ isAvailable: true }).sort({ category: 1, name: 1 }).lean(),
    Table.find({ isActive: true }).sort({ number: 1 }).lean(),
    searchParams,
  ])

  const items: PublicMenuItem[] = docs.map(doc => ({
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description ?? '',
    category: doc.category,
    price: doc.price,
    image: doc.image ?? '',
    isPopular: doc.isPopular ?? false,
  }))
  const tables: PublicTable[] = tableDocs.map(t => ({ number: t.number, name: t.name ?? '' }))

  // QR codes link to /?table=5 so the table is filled in for the guest.
  const requested = Number(params.table)
  const initialTable = Number.isInteger(requested) && (tables.length === 0 ? requested > 0 : tables.some(t => t.number === requested)) ? requested : null

  return <CustomerMenu items={items} tables={tables} initialTable={initialTable} />
}
