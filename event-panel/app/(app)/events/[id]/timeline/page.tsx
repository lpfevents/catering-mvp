import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/Card'
import { addTask } from './actions'

export default async function TimelinePage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id,title,description,due_at,status,assignee_name,assignee_phone,created_at')
    .eq('event_id', params.id)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  const byStatus = {
    todo: tasks?.filter((t) => t.status === 'todo') ?? [],
    doing: tasks?.filter((t) => t.status === 'doing') ?? [],
    done: tasks?.filter((t) => t.status === 'done') ?? [],
    overdue: tasks?.filter((t) => t.status === 'overdue') ?? [],
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Добавить задачу">
          <form action={addTask.bind(null, params.id)} className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm">Задача</span>
              <input name="title" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Например: финализировать смету" required />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Описание (опц.)</span>
              <input name="description" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="контакт/детали" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm">Дедлайн (опц.)</span>
                <input name="due_at" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="2026-02-07 18:00" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Статус</span>
                <select name="status" className="rounded-lg border border-slate-200 px-3 py-2">
                  <option value="todo">todo</option>
                  <option value="doing">doing</option>
                  <option value="done">done</option>
                  <option value="overdue">overdue</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm">Ответственный (имя)</span>
                <input name="assignee_name" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Аня" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Телефон/контакт</span>
                <input name="assignee_phone" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="+995..." />
              </label>
            </div>
            <button className="rounded-lg bg-slate-900 text-white py-2">Добавить</button>
            <p className="text-xs text-slate-500">
              Лист «Тайминг для стаффа» из Excel будем импортировать сюда как задачи/события.
            </p>
          </form>
        </Card>

        <Card title="Канбан (сводка)">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-slate-600">todo</div>
              <div className="text-xl font-semibold">{byStatus.todo.length}</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-slate-600">doing</div>
              <div className="text-xl font-semibold">{byStatus.doing.length}</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-slate-600">done</div>
              <div className="text-xl font-semibold">{byStatus.done.length}</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-slate-600">overdue</div>
              <div className="text-xl font-semibold">{byStatus.overdue.length}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Список задач">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="py-2">Задача</th>
                <th>Ответственный</th>
                <th className="text-right">Дедлайн</th>
                <th className="text-right">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(tasks ?? []).length === 0 ? (
                <tr>
                  <td className="py-4 text-slate-600" colSpan={4}>
                    Пока пусто.
                  </td>
                </tr>
              ) : (
                (tasks ?? []).map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 pr-2">
                      <div className="font-medium">{t.title}</div>
                      {t.description ? <div className="text-slate-600">{t.description}</div> : null}
                    </td>
                    <td className="py-2 pr-2">
                      {t.assignee_name ? <div>{t.assignee_name}</div> : <div className="text-slate-600">—</div>}
                      {t.assignee_phone ? <div className="text-xs text-slate-600">{t.assignee_phone}</div> : null}
                    </td>
                    <td className="py-2 pr-2 text-right">{t.due_at ?? '—'}</td>
                    <td className="py-2 text-right">{t.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
