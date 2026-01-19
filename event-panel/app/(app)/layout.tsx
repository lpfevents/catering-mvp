import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from './actions'

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100">
      {children}
    </Link>
  )
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email ?? '—'

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/events" className="no-underline">
              <span className="font-semibold">Event Panel</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <NavLink href="/events">Ивенты</NavLink>
            </nav>
          </div>

          <form action={signOut}>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
              Выйти ({email})
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
