import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/Card'

function n(v: number | null | undefined) {
  return typeof v === 'number' ? v : 0
}

export default async function DashboardPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id,name,date,location,guests')
    .eq('id', params.id)
    .single()

  if (eventErr) throw new Error(eventErr.message)

  const [{ data: budget }, { data: payments }, { data: tasks }] = await Promise.all([
    supabase
      .from('budget_items')
      .select('total_amount')
      .eq('event_id', params.id),
    supabase
      .from('payments')
      .select('amount,status')
      .eq('event_id', params.id),
    supabase
      .from('tasks')
      .select('status')
      .eq('event_id', params.id),
  ])

  const planTotal = (budget ?? []).reduce((s, r) => s + n(r.total_amount), 0)
  const paidTotal = (payments ?? []).filter((p) => p.status === 'paid').reduce((s, r) => s + n(r.amount), 0)
  const dueTotal = (payments ?? []).filter((p) => p.status !== 'paid').reduce((s, r) => s + n(r.amount), 0)

  const totalTasks = (tasks ?? []).length
  const doneTasks = (tasks ?? []).filter((t) => t.status === 'done').length
  const overdueTasks = (tasks ?? []).filter((t) => t.status === 'overdue').length

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{event.name}</h1>
            <p className="text-sm text-slate-600">
              {event.date}
              {event.location ? ` • ${event.location}` : ''}
              {event.guests ? ` • ${event.guests} гостей` : ''}
            </p>
          </div>
          <div className="text-sm text-slate-600">
            <div>План: <span className="font-medium text-slate-900">{planTotal.toFixed(2)}</span></div>
            <div>Оплачено: <span className="font-medium text-slate-900">{paidTotal.toFixed(2)}</span></div>
            <div>К оплате: <span className="font-medium text-slate-900">{Math.max(0, planTotal - paidTotal).toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Бюджет">
          <div className="text-sm text-slate-600">План / Оплачено / К оплате</div>
          <div className="mt-2 text-xl font-semibold">{planTotal.toFixed(2)}</div>
          <div className="mt-1 text-sm text-slate-700">Оплачено: {paidTotal.toFixed(2)}</div>
          <div className="text-sm text-slate-700">Осталось: {Math.max(0, planTotal - paidTotal).toFixed(2)}</div>
          <div className="mt-3 text-xs text-slate-500">
            Заполните «Смета & Оплаты», чтобы видеть прогресс.
          </div>
        </Card>

        <Card title="Задачи">
          <div className="text-sm text-slate-600">Всего / Готово / Просрочено</div>
          <div className="mt-2 text-xl font-semibold">{totalTasks}</div>
          <div className="mt-1 text-sm text-slate-700">Готово: {doneTasks}</div>
          <div className="text-sm text-slate-700">Просрочено: {overdueTasks}</div>
          <div className="mt-3 text-xs text-slate-500">
            Тайминг и задачи — вкладка «Тайминг & Задачи».
          </div>
        </Card>

        <Card title="Оплаты">
          <div className="text-sm text-slate-600">Оплачено / В работе</div>
          <div className="mt-2 text-xl font-semibold">{paidTotal.toFixed(2)}</div>
          <div className="mt-1 text-sm text-slate-700">В работе: {dueTotal.toFixed(2)}</div>
          <div className="mt-3 text-xs text-slate-500">
            Платежи привязываются к позициям сметы.
          </div>
        </Card>
      </div>
    </div>
  )
}
