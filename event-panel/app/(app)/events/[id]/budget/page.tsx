import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/Card'
import { addBudgetItem, addPayment } from './actions'

function money(v: number | null) {
  return (v ?? 0).toFixed(2)
}

export default async function BudgetPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: items, error: itemsErr } = await supabase
    .from('budget_items')
    .select('id,category,title,unit,qty,price,total_amount,status')
    .eq('event_id', params.id)
    .order('category', { ascending: true })
    .order('created_at', { ascending: true })

  if (itemsErr) throw new Error(itemsErr.message)

  const { data: payments, error: payErr } = await supabase
    .from('payments')
    .select('id,budget_item_id,amount,due_date,status')
    .eq('event_id', params.id)
    .order('created_at', { ascending: false })

  if (payErr) throw new Error(payErr.message)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Добавить позицию сметы">
          <form action={addBudgetItem.bind(null, params.id)} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm">Категория</span>
                <input name="category" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Staff / Decor / Drinks" required />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Ед.</span>
                <input name="unit" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="unit / hour / bottle" />
              </label>
            </div>
            <label className="grid gap-1">
              <span className="text-sm">Позиция</span>
              <input name="title" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="DJ / Photographer / Flowers" required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm">Кол-во</span>
                <input name="qty" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="1" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Цена</span>
                <input name="price" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="100" />
              </label>
            </div>
            <button className="rounded-lg bg-slate-900 text-white py-2">Добавить</button>
            <p className="text-xs text-slate-500">
              На следующем шаге мы добавим импорт из вашего Excel (Main/Decor/Drinks/Staff Food и т.д.).
            </p>
          </form>
        </Card>

        <Card title="Добавить платеж (аванс/остаток)">
          <form action={addPayment.bind(null, params.id)} className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm">К какой позиции</span>
              <select name="budget_item_id" className="rounded-lg border border-slate-200 px-3 py-2" required>
                <option value="" disabled selected>
                  Выберите позицию
                </option>
                {(items ?? []).map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.category}: {it.title} ({money(it.total_amount)})
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm">Сумма</span>
                <input name="amount" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="500" required />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Статус</span>
                <select name="status" className="rounded-lg border border-slate-200 px-3 py-2">
                  <option value="planned">planned</option>
                  <option value="paid">paid</option>
                </select>
              </label>
            </div>
            <label className="grid gap-1">
              <span className="text-sm">Дата оплаты (опц.)</span>
              <input name="due_date" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="2026-01-25" />
            </label>
            <button className="rounded-lg bg-slate-900 text-white py-2">Добавить платеж</button>
            <p className="text-xs text-slate-500">
              Напоминания по платежам подключим через cron (Vercel Cron / Supabase Edge). 
            </p>
          </form>
        </Card>
      </div>

      <Card title="Смета">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="py-2">Категория</th>
                <th>Позиция</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Price</th>
                <th className="text-right">Total</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(items ?? []).length === 0 ? (
                <tr>
                  <td className="py-4 text-slate-600" colSpan={6}>
                    Пока пусто. Добавьте первую позицию выше.
                  </td>
                </tr>
              ) : (
                (items ?? []).map((it) => (
                  <tr key={it.id}>
                    <td className="py-2 pr-2 whitespace-nowrap">{it.category}</td>
                    <td className="py-2 pr-2">{it.title}</td>
                    <td className="py-2 pr-2 text-right">{it.qty ?? 0}</td>
                    <td className="py-2 pr-2 text-right">{money(it.price)}</td>
                    <td className="py-2 pr-2 text-right">{money(it.total_amount)}</td>
                    <td className="py-2 text-right">{it.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Платежи">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="py-2">Позиция</th>
                <th className="text-right">Сумма</th>
                <th className="text-right">Дата</th>
                <th className="text-right">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(payments ?? []).length === 0 ? (
                <tr>
                  <td className="py-4 text-slate-600" colSpan={4}>
                    Пока нет платежей.
                  </td>
                </tr>
              ) : (
                (payments ?? []).map((p) => {
                  const item = (items ?? []).find((x) => x.id === p.budget_item_id)
                  return (
                    <tr key={p.id}>
                      <td className="py-2 pr-2">{item ? `${item.category}: ${item.title}` : p.budget_item_id}</td>
                      <td className="py-2 pr-2 text-right">{money(p.amount)}</td>
                      <td className="py-2 pr-2 text-right">{p.due_date ?? '—'}</td>
                      <td className="py-2 text-right">{p.status}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
