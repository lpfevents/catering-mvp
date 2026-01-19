import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/Card'
import { addRiderDoc, addRiderItem } from './actions'

export default async function RidersPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: docs, error: docsErr } = await supabase
    .from('rider_docs')
    .select('id,title,created_at')
    .eq('event_id', params.id)
    .order('created_at', { ascending: false })
  if (docsErr) throw new Error(docsErr.message)

  const { data: items, error: itemsErr } = await supabase
    .from('rider_items')
    .select('id,rider_doc_id,section,text,severity,provider,due_date,status')
    .eq('event_id', params.id)
    .order('created_at', { ascending: false })
  if (itemsErr) throw new Error(itemsErr.message)

  const critical = (items ?? []).filter((i) => i.severity === 'critical')

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Добавить райдер (текстом)">
          <form action={addRiderDoc.bind(null, params.id)} className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm">Название</span>
              <input name="title" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Rider Mad Mozart" required />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Текст райдера</span>
              <textarea name="raw_text" className="min-h-[180px] rounded-lg border border-slate-200 px-3 py-2" placeholder="Вставьте текст из листа Rider..." required />
            </label>
            <button className="rounded-lg bg-slate-900 text-white py-2">Сохранить</button>
            <p className="text-xs text-slate-500">
              Следующий шаг: автоматический парсер райдера в пункты (Sound/Backline/Stage/Power) + конфликты.
            </p>
          </form>
        </Card>

        <Card title="Добавить пункт райдера (структурно)">
          <form action={addRiderItem.bind(null, params.id)} className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm">К какому райдеру</span>
              <select name="rider_doc_id" className="rounded-lg border border-slate-200 px-3 py-2" required>
                <option value="" disabled selected>
                  Выберите райдер
                </option>
                {(docs ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm">Секция</span>
                <input name="section" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Sound / Backline / Stage" required />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Кто предоставляет</span>
                <select name="provider" className="rounded-lg border border-slate-200 px-3 py-2">
                  <option value="vendor">Техподрядчик</option>
                  <option value="venue">Площадка</option>
                  <option value="artist">Артист</option>
                  <option value="us">Мы</option>
                </select>
              </label>
            </div>
            <label className="grid gap-1">
              <span className="text-sm">Пункт</span>
              <input name="text" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Например: 2x Wedge monitors..." required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm">Критичность</span>
                <select name="severity" className="rounded-lg border border-slate-200 px-3 py-2">
                  <option value="normal">normal</option>
                  <option value="critical">critical</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Дедлайн (опц.)</span>
                <input name="due_date" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="2026-02-05" />
              </label>
            </div>
            <button className="rounded-lg bg-slate-900 text-white py-2">Добавить пункт</button>
          </form>
        </Card>
      </div>

      <Card title={`Критичные пункты (${critical.length})`}>
        <RiderItemsTable rows={critical} docs={docs ?? []} />
      </Card>

      <Card title="Все пункты райдера">
        <RiderItemsTable rows={items ?? []} docs={docs ?? []} />
      </Card>
    </div>
  )
}

function RiderItemsTable({
  rows,
  docs,
}: {
  rows: Array<{
    id: string
    rider_doc_id: string
    section: string
    text: string
    severity: string
    provider: string
    due_date: string | null
    status: string
  }>
  docs: Array<{ id: string; title: string }>
}) {
  const docTitle = (id: string) => docs.find((d) => d.id === id)?.title ?? id

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-600">
            <th className="py-2">Райдер</th>
            <th>Секция</th>
            <th>Пункт</th>
            <th className="text-right">Provider</th>
            <th className="text-right">Due</th>
            <th className="text-right">Severity</th>
            <th className="text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr>
              <td className="py-4 text-slate-600" colSpan={7}>
                Пока пусто.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2 pr-2">{docTitle(r.rider_doc_id)}</td>
                <td className="py-2 pr-2 whitespace-nowrap">{r.section}</td>
                <td className="py-2 pr-2">{r.text}</td>
                <td className="py-2 pr-2 text-right">{r.provider}</td>
                <td className="py-2 pr-2 text-right">{r.due_date ?? '—'}</td>
                <td className="py-2 pr-2 text-right">{r.severity}</td>
                <td className="py-2 text-right">{r.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
