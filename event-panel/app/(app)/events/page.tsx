import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createEvent } from './actions'

export default async function EventsPage() {
  const supabase = createClient()
  const { data: user } = await supabase.auth.getUser()

  const { data: events, error } = await supabase
    .from('events')
    .select('id,name,date,location,guests')
    .order('date', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Ивенты</h1>
          <p className="text-sm text-slate-600">Вы вошли как {user.user?.email}</p>
        </div>
        <Link
          href="/events/import"
          className="rounded-xl bg-black px-4 py-2 text-sm text-white no-underline"
        >
          Импорт из Excel
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Создать ивент</h2>
          <form action={createEvent} className="mt-4 grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm">Название</span>
              <input name="name" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="NY PARTY" required />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Дата (ISO или текст)</span>
              <input name="date" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="2026-02-07" required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm">Локация</span>
                <input name="location" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Venue" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Гости</span>
                <input name="guests" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="120" />
              </label>
            </div>
            <button className="rounded-lg bg-slate-900 text-white py-2">Создать</button>
          </form>
          <p className="mt-3 text-xs text-slate-500">
            Если у вас уже есть смета в Excel — используйте кнопку «Импорт из Excel» сверху.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Мои ивенты</h2>
          <div className="mt-4 divide-y">
            {(events ?? []).length === 0 ? (
              <p className="text-sm text-slate-600">Пока нет ивентов. Создайте первый слева.</p>
            ) : (
              (events ?? []).map((e) => (
                <div key={e.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-sm text-slate-600">
                      {e.date} {e.location ? `• ${e.location}` : ''} {e.guests ? `• ${e.guests} гостей` : ''}
                    </div>
                  </div>
                  <Link
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm no-underline hover:bg-slate-50"
                    href={`/events/${e.id}/dashboard`}
                  >
                    Открыть
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
