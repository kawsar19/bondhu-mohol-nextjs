import { redirect } from 'next/navigation'

// There is no guest-facing page any more: the manager enters every order from the dashboard.
export default function Home() {
  redirect('/admin')
}
