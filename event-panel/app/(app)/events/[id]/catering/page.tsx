import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/Card'
import { addMenuItem } from './actions'

function money(v: number | null) {
  return (v ?? 0).toFixed(2)
}

export default async function CateringPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: event } = await supabase.from('events').select('guests').eq('id', params.id).single()
  const guests = event?.guests ?? 0

  const { data: items, error } = await supabase
    .from('menu_items')
    .select('id,menu_type,position,unit,qty,price,total_amount,weight_g,total_weight_g,note,status')
    .eq('event_id', params.id)
    .order('menu_type', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)

  const guestItems = (items ?? []).filter((i) => i.menu_type === 'guest')
  const staffItems = (items ?? []).filter((i) => i.menu_type === 'staff')

  const guestWeightTotal = guestItems.reduce((s, i) => s + (i.total_weight_g ?? 0), 0)
  const perGuestG = guests > 0 ? guestWeightTotal / guests : 0

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Добавить позицию меню">
          <form action={addMenuItem.bind(null, params.id)} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm">Тип</span>
                <select name="menu_type" className="rounded-lg border border-slate-200 px-3 py-2">
                  <option value="guest">Гости</option>
                  <option value="staff">Стафф</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Ед.</span>
                <input name="unit" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="шт/порция" />
              </label>
            </div>
            <label className="grid gap-1">
              <span className="text-sm">Позиция</span>
              <input name="position" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Закуска / Салат / Горячее" required />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="grid gap-1">
                <span className="text-sm">Кол-во</span>
                <input name="qty" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="120" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Цена</span>
                <input name="price" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="10" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Вес 1шт (г)</span>
                <input name="weight_g" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="80" />
              </label>
            </div>
            <label className="grid gap-1">
              <span className="text-sm">Комментарий</span>
              <input name="note" className="rounded-lg border border-slate-200 px-3 py-2" placeholder="подача/аллергены/тайминг" />
            </label>
            <button className="rounded-lg bg-slate-900 text-white py-2">Добавить</button>
          </form>
        </Card>

        <Card title="Сводка">
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-600">Гостей</span><span className="font-medium">{guests || '—'}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-600">Общий вес (гости)</span><span className="font-medium">{guestWeightTotal.toFixed(0)} г</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-600">На гостя</span><span className="font-medium">{perGuestG.toFixed(0)} г/чел</span></div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Лист «Меню» из вашего Excel ложится сюда 1-в-1, включая веса и итоги.
          </p>
        </Card>
      </div>

      <Card title="Меню для гостей">
        <MenuTable rows={guestItems} />
      </Card>

      <Card title="Меню для стаффа">
        <MenuTable rows={staffItems} />
      </Card>
    </div>
  )
}

function MenuTable({
  rows,
}: {
  rows: Array<{
    id: string
    position: string
    unit: string | null
    qty: number | null
    price: number | null
    total_amount: number | null
    weight_g: number | null
    total_weight_g: number | null
    note: string | null
    status: string | null
  }>
}) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-600">
            <th className="py-2">Позиция</th>
            <th>Ед.</th>
            <th className="text-right">Кол-во</th>
            <th className="text-right">Цена</th>
            <th className="text-right">Итого</th>
            <th className="text-right">Вес 1</th>
            <th className="text-right">Вес итого</th>
            <th>Комментарий</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr>
              <td className="py-4 text-slate-600" colSpan={8}>
                Пока пусто.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2 pr-2">{r.position}</td>
                <td className="py-2 pr-2">{r.unit ?? '—'}</td>
                <td className="py-2 pr-2 text-right">{r.qty ?? 0}</td>
                <td className="py-2 pr-2 text-right">{money(r.price)}</td>
                <td className="py-2 pr-2 text-right">{money(r.total_amount)}</td>
                <td className="py-2 pr-2 text-right">{(r.weight_g ?? 0).toFixed(0)} г</td>
                <td className="py-2 pr-2 text-right">{(r.total_weight_g ?? 0).toFixed(0)} г</td>
                <td className="py-2">{r.note ?? ''}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
