// app/page.tsx — redirect root to /login
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/login')
}
