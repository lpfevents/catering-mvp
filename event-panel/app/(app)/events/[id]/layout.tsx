import Link from 'next/link'

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`no-underline rounded-lg px-3 py-2 text-sm border ${
        active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 hover:bg-slate-50'
      }`}
    >
      {label}
    </Link>
  )
}

export default function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const id = params.id

  // Active tab on server is tricky without request path; keep simple links.
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/events" className="text-sm no-underline">← К списку ивентов</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Tab href={`/events/${id}/dashboard`} label="Обзор" active={false} />
        <Tab href={`/events/${id}/budget`} label="Смета & Оплаты" active={false} />
        <Tab href={`/events/${id}/catering`} label="Меню" active={false} />
        <Tab href={`/events/${id}/riders`} label="Райдеры" active={false} />
        <Tab href={`/events/${id}/timeline`} label="Тайминг & Задачи" active={false} />
      </div>

      {children}
    </div>
  )
}
