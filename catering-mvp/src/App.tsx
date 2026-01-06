import React, { useEffect, useMemo, useState } from 'react'
import type { CatalogItem, Dish, DishIngredient, Order, OrderLine, PurchaseLine, Uom } from './types'
import { loadState, saveState, Id, type DbState } from './storage'
import { buildPurchaseList } from './calc'
import { exportDbXlsx, exportPurchaseXlsx, importDbXlsx } from './xlsx'
import { SectionTitle, EmptyState } from './ui'

type Tab = 'orders' | 'purchase' | 'dishes' | 'items' | 'excel'
const UOMS: { value: Uom; label: string }[] = [
  { value: 'pcs', label: 'шт' },
  { value: 'portion', label: 'порц' },
  { value: 'kg', label: 'кг' },
  { value: 'l', label: 'л' },
]
function fmt(n: number, uom: Uom) {
  const abs = Math.abs(n)
  const s = abs >= 10 ? n.toFixed(1) : abs >= 1 ? n.toFixed(2) : n.toFixed(3)
  const cleaned = s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
  const u = uom === 'pcs' ? 'шт' : uom === 'portion' ? 'порц' : uom === 'kg' ? 'кг' : 'л'
  return `${cleaned} ${u}`
}

export default function App() {
  const [db, setDb] = useState<DbState>(() => loadState())
  const [tab, setTab] = useState<Tab>('orders')
  const [selectedOrderId, setSelectedOrderId] = useState<string>(() => db.orders[0]?.id ?? '')
  const [purchaseFilter, setPurchaseFilter] = useState<'pending' | 'bought' | 'all'>('pending')

  useEffect(() => { saveState(db) }, [db])

  const selectedOrder = useMemo(() => db.orders.find(o => o.id === selectedOrderId) ?? null, [db.orders, selectedOrderId])
  const orderLines = useMemo(() => db.orderLines.filter(l => l.orderId === selectedOrderId), [db.orderLines, selectedOrderId])

  const purchaseLines: PurchaseLine[] = useMemo(() => {
    if (!selectedOrderId) return []
    return buildPurchaseList({
      orderId: selectedOrderId,
      items: db.items,
      dishes: db.dishes,
      ingredients: db.ingredients,
      lines: db.orderLines,
      boughtMap: db.boughtByOrder[selectedOrderId]
    })
  }, [db, selectedOrderId])

  const filteredPurchase = useMemo(() => {
    if (purchaseFilter === 'all') return purchaseLines
    if (purchaseFilter === 'bought') return purchaseLines.filter(x => x.bought)
    return purchaseLines.filter(x => !x.bought)
  }, [purchaseLines, purchaseFilter])

  function createOrder() {
    const id = `order_${Date.now()}`
    const dateISO = new Date().toISOString().slice(0, 10)
    const order: Order = { id, dateISO, client: '', note: '' }
    setDb(prev => ({ ...prev, orders: [order, ...prev.orders] }))
    setSelectedOrderId(id)
  }

  function deleteOrder(orderId: string) {
    if (!confirm('Удалить заказ?')) return
    setDb(prev => ({
      ...prev,
      orders: prev.orders.filter(o => o.id !== orderId),
      orderLines: prev.orderLines.filter(l => l.orderId !== orderId),
      boughtByOrder: Object.fromEntries(Object.entries(prev.boughtByOrder).filter(([k]) => k !== orderId))
    }))
    const next = db.orders.find(o => o.id !== orderId)?.id ?? ''
    setSelectedOrderId(next)
  }

  function addOrderLine() {
    if (!selectedOrderId) return
    if (db.dishes.length === 0) { alert('Сначала добавьте блюдо на вкладке “Блюда”'); return }
    const line: OrderLine = { id: Id.uid('ol'), orderId: selectedOrderId, dishId: db.dishes[0].id, qty: 1, uom: 'pcs' }
    setDb(prev => ({ ...prev, orderLines: [line, ...prev.orderLines] }))
  }

  function toggleBought(itemId: string) {
    if (!selectedOrderId) return
    setDb(prev => {
      const current = prev.boughtByOrder[selectedOrderId] ?? {}
      const next = { ...current, [itemId]: !current[itemId] }
      return { ...prev, boughtByOrder: { ...prev.boughtByOrder, [selectedOrderId]: next } }
    })
  }
  function resetBought() {
    if (!selectedOrderId) return
    if (!confirm('Сбросить отметки "куплено"?')) return
    setDb(prev => ({ ...prev, boughtByOrder: { ...prev.boughtByOrder, [selectedOrderId]: {} } }))
  }

  function exportPurchase() {
    if (!selectedOrder) return
    exportPurchaseXlsx(purchaseLines, `purchase_${selectedOrder.id}_${selectedOrder.dateISO}.xlsx`)
  }
  function exportAllDb() {
    exportDbXlsx({
      items: db.items,
      dishes: db.dishes,
      ingredients: db.ingredients,
      orders: db.orders,
      orderLines: db.orderLines
    }, 'catering_export.xlsx')
  }
  async function importAllDb(file: File) {
    const imported = await importDbXlsx(file)
    setDb(prev => ({
      ...prev,
      items: imported.items ?? prev.items,
      dishes: imported.dishes ?? prev.dishes,
      ingredients: imported.ingredients ?? prev.ingredients,
      orders: imported.orders ?? prev.orders,
      orderLines: imported.orderLines ?? prev.orderLines,
    }))
    alert('Импорт выполнен. Проверьте данные.')
  }

  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <div className="logo" />
          <div>
            <div className="h1">Catering MVP</div>
            <div className="sub">Заказ → Закупка → чекбокс “куплено”. Данные хранятся локально в браузере.</div>
          </div>
        </div>
        <div className="tabs">
          <button className={'tab ' + (tab === 'orders' ? 'active' : '')} onClick={() => setTab('orders')}>Заказы</button>
          <button className={'tab ' + (tab === 'purchase' ? 'active' : '')} onClick={() => setTab('purchase')}>Закупка</button>
          <button className={'tab ' + (tab === 'dishes' ? 'active' : '')} onClick={() => setTab('dishes')}>Блюда</button>
          <button className={'tab ' + (tab === 'items' ? 'active' : '')} onClick={() => setTab('items')}>Номенклатура</button>
          <button className={'tab ' + (tab === 'excel' ? 'active' : '')} onClick={() => setTab('excel')}>Excel</button>
        </div>
      </div>

      {tab === 'orders' && (
        <div className="split">
          <div className="card pad">
            <SectionTitle title="Заказы" subtitle="Выберите заказ или создайте новый." right={<button className="btn primary" onClick={createOrder}>+ Новый</button>} />
            <div className="list">
              {db.orders.length === 0 ? <div className="small muted">Нет заказов</div> : db.orders.map(o => (
                <div key={o.id} className="itemRow" style={{ borderColor: o.id === selectedOrderId ? 'rgba(78,161,255,.5)' : undefined }}>
                  <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => setSelectedOrderId(o.id)}>
                    <div className="title">{o.client?.trim() ? o.client : 'Без клиента'}</div>
                    <div className="meta">{o.id} • {o.dateISO}</div>
                  </div>
                  <button className="btn" onClick={() => { setSelectedOrderId(o.id); setTab('purchase') }}>Закупка</button>
                </div>
              ))}
            </div>
          </div>

          <div className="card pad">
            <SectionTitle
              title="Детали заказа"
              subtitle="Вводите только блюдо и количество."
              right={
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn" onClick={() => setTab('purchase')} disabled={!selectedOrderId}>Сформировать закупку</button>
                  <button className="btn danger" onClick={() => selectedOrderId && deleteOrder(selectedOrderId)} disabled={!selectedOrderId}>Удалить</button>
                </div>
              }
            />

            {!selectedOrder ? (
              <EmptyState title="Выберите или создайте заказ" />
            ) : (
              <div className="grid two">
                <div>
                  <div className="label">Дата</div>
                  <input className="input" type="date" value={selectedOrder.dateISO}
                    onChange={e => setDb(prev => ({ ...prev, orders: prev.orders.map(o => o.id === selectedOrder.id ? { ...o, dateISO: e.target.value } : o) }))} />
                </div>
                <div>
                  <div className="label">Клиент</div>
                  <input className="input" value={selectedOrder.client ?? ''} placeholder="можно пусто"
                    onChange={e => setDb(prev => ({ ...prev, orders: prev.orders.map(o => o.id === selectedOrder.id ? { ...o, client: e.target.value } : o) }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="label">Комментарий</div>
                  <textarea value={selectedOrder.note ?? ''} placeholder="адрес, ТЗ…"
                    onChange={e => setDb(prev => ({ ...prev, orders: prev.orders.map(o => o.id === selectedOrder.id ? { ...o, note: e.target.value } : o) }))} />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <SectionTitle title="Позиции заказа" right={<button className="btn primary" onClick={addOrderLine}>+ Добавить блюдо</button>} />
                  {orderLines.length === 0 ? <div className="small muted">Добавьте блюдо.</div> : (
                    <table className="table">
                      <thead><tr><th>Блюдо</th><th style={{ width: 110 }}>Кол-во</th><th style={{ width: 110 }}>Ед.</th><th style={{ width: 90 }}></th></tr></thead>
                      <tbody>
                        {orderLines.map(l => (
                          <tr key={l.id}>
                            <td>
                              <select value={l.dishId} onChange={e => setDb(prev => ({ ...prev, orderLines: prev.orderLines.map(x => x.id === l.id ? { ...x, dishId: e.target.value } : x) }))}>
                                {db.dishes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                              </select>
                            </td>
                            <td>
                              <input className="input" type="number" min={0} step={1} value={l.qty}
                                onChange={e => setDb(prev => ({ ...prev, orderLines: prev.orderLines.map(x => x.id === l.id ? { ...x, qty: Number(e.target.value || 0) } : x) }))} />
                            </td>
                            <td>
                              <select value={l.uom} onChange={e => setDb(prev => ({ ...prev, orderLines: prev.orderLines.map(x => x.id === l.id ? { ...x, uom: e.target.value as Uom } : x) }))}>
                                {UOMS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                              </select>
                            </td>
                            <td>
                              <button className="btn danger" onClick={() => setDb(prev => ({ ...prev, orderLines: prev.orderLines.filter(x => x.id !== l.id) }))}>Удалить</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'purchase' && (
        <div className="card pad">
          <SectionTitle
            title="Список закупки"
            subtitle={selectedOrder ? `Заказ: ${selectedOrder.id} • ${selectedOrder.dateISO}` : 'Выберите заказ на вкладке “Заказы”'}
            right={
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <select value={purchaseFilter} onChange={e => setPurchaseFilter(e.target.value as any)}>
                  <option value="pending">Не куплено</option>
                  <option value="bought">Куплено</option>
                  <option value="all">Все</option>
                </select>
                <button className="btn" onClick={exportPurchase} disabled={!selectedOrderId}>Экспорт .xlsx</button>
                <button className="btn" onClick={resetBought} disabled={!selectedOrderId}>Сбросить</button>
              </div>
            }
          />

          {!selectedOrderId ? (
            <EmptyState title="Сначала выберите заказ" action={<button className="btn primary" onClick={() => setTab('orders')}>К заказам</button>} />
          ) : purchaseLines.length === 0 ? (
            <EmptyState title="Пока нечего закупать" hint="Добавьте блюда в заказ и ингредиенты в блюдах." />
          ) : (
            <table className="table">
              <thead><tr><th style={{ width: 44 }}></th><th>Позиция</th><th style={{ width: 170 }}>Нужно</th><th style={{ width: 230 }}>Округление</th><th style={{ width: 180 }}>Поставщик</th></tr></thead>
              <tbody>
                {filteredPurchase.map(p => (
                  <tr key={p.itemId}>
                    <td><input className="checkbox" type="checkbox" checked={p.bought} onChange={() => toggleBought(p.itemId)} /></td>
                    <td className={p.bought ? 'strike' : undefined}>
                      <div style={{ fontWeight: 900 }}>{p.itemName}</div>
                      <div className="small">{p.comment}</div>
                    </td>
                    <td className={p.bought ? 'strike' : undefined}>{fmt(p.qtyExact, p.uom)}</td>
                    <td className={p.bought ? 'strike' : undefined}>
                      {p.packSize ? <span>{fmt(p.qtyRounded, p.uom)} <span className="small">({p.packs} {p.packUom})</span></span> : <span className="small muted">—</span>}
                    </td>
                    <td className={p.bought ? 'strike' : undefined}>{p.supplier ?? <span className="small muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'items' && <ItemsScreen db={db} setDb={setDb} />}

      {tab === 'dishes' && <DishesScreen db={db} setDb={setDb} />}

      {tab === 'excel' && (
        <div className="grid two">
          <div className="card pad">
            <SectionTitle title="Экспорт базы в Excel" subtitle="Скачает всю базу (номенклатура/блюда/заказы)." />
            <button className="btn primary" onClick={exportAllDb}>Скачать catering_export.xlsx</button>
            <div className="small" style={{ marginTop: 8 }}>
              Листы: <b>Catalog</b>, <b>Dishes</b>, <b>DishIngredients</b>, <b>Orders</b>, <b>OrderLines</b>
            </div>
          </div>

          <div className="card pad">
            <SectionTitle title="Импорт базы из Excel" subtitle="Импортирует те же листы. MVP: перезаписывает данные." />
            <input className="input" type="file" accept=".xlsx" onChange={async e => {
              const f = e.target.files?.[0]; if (!f) return
              try { await importAllDb(f) } catch (err: any) { alert(err?.message ?? 'Ошибка импорта') }
              e.currentTarget.value = ''
            }} />
            <div className="small" style={{ marginTop: 8 }}>
              Дальше добавим “умный” импорт по названию, как ты хотел.
            </div>
          </div>

          <div className="card pad" style={{ gridColumn: '1 / -1' }}>
            <SectionTitle title="Где хранится база" subtitle="Пока без сервера: данные хранятся локально в браузере (localStorage)." />
            <div className="small">Для команды 2–5 человек позже подключим аккаунты и общий сервер (Supabase/Firebase).</div>
          </div>
        </div>
      )}
    </div>
  )
}

function ItemsScreen(props: { db: DbState; setDb: React.Dispatch<React.SetStateAction<DbState>> }) {
  const { db, setDb } = props
  const [selectedId, setSelectedId] = useState<string>(db.items[0]?.id ?? '')
  const selected = db.items.find(i => i.id === selectedId) ?? null

  function create() {
    const item: CatalogItem = { id: Id.uid('item'), name: 'Новая позиция', type: 'food', uom: 'pcs', packSize: null, packUom: null, supplier: null }
    setDb(prev => ({ ...prev, items: [item, ...prev.items] }))
    setSelectedId(item.id)
  }
  function remove(id: string) {
    if (!confirm('Удалить позицию?')) return
    setDb(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id), ingredients: prev.ingredients.filter(ing => ing.itemId !== id) }))
    setSelectedId(db.items.find(x => x.id !== id)?.id ?? '')
  }

  return (
    <div className="split">
      <div className="card pad">
        <SectionTitle title="Номенклатура" subtitle="Продукты/упаковка/инвентарь — всё тут." right={<button className="btn primary" onClick={create}>+ Добавить</button>} />
        <div className="list">
          {db.items.map(i => (
            <div key={i.id} className="itemRow" style={{ borderColor: i.id === selectedId ? 'rgba(78,161,255,.5)' : undefined }}>
              <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => setSelectedId(i.id)}>
                <div className="title">{i.name}</div>
                <div className="meta">{i.type} • {i.uom} • {i.supplier ?? '—'}</div>
              </div>
              <button className="btn danger" onClick={() => remove(i.id)}>Удалить</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card pad">
        <SectionTitle title="Карточка позиции" subtitle="Упаковка нужна для округления закупки." />
        {!selected ? <EmptyState title="Выберите позицию" /> : (
          <div className="grid two">
            <div style={{ gridColumn:'1 / -1' }}>
              <div className="label">Название</div>
              <input className="input" value={selected.name} onChange={e => setDb(prev => ({ ...prev, items: prev.items.map(x => x.id === selected.id ? { ...x, name: e.target.value } : x) }))} />
            </div>
            <div>
              <div className="label">Тип</div>
              <select value={selected.type} onChange={e => setDb(prev => ({ ...prev, items: prev.items.map(x => x.id === selected.id ? { ...x, type: e.target.value as any } : x) }))}>
                <option value="food">food</option><option value="packaging">packaging</option><option value="inventory">inventory</option><option value="other">other</option>
              </select>
            </div>
            <div>
              <div className="label">Ед. изм.</div>
              <select value={selected.uom} onChange={e => setDb(prev => ({ ...prev, items: prev.items.map(x => x.id === selected.id ? { ...x, uom: e.target.value as Uom } : x) }))}>
                {UOMS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div>
              <div className="label">Поставщик</div>
              <input className="input" value={selected.supplier ?? ''} onChange={e => setDb(prev => ({ ...prev, items: prev.items.map(x => x.id === selected.id ? { ...x, supplier: e.target.value } : x) }))} />
            </div>
            <div>
              <div className="label">Размер упаковки</div>
              <input className="input" type="number" min={0} step="0.01" value={selected.packSize ?? ''} onChange={e => setDb(prev => ({ ...prev, items: prev.items.map(x => x.id === selected.id ? { ...x, packSize: e.target.value === '' ? null : Number(e.target.value) } : x) }))} />
              <div className="small">Напр: 2 (кг) или 50 (шт)</div>
            </div>
            <div>
              <div className="label">Ед. упаковки (уп/кор/пач)</div>
              <input className="input" value={selected.packUom ?? ''} onChange={e => setDb(prev => ({ ...prev, items: prev.items.map(x => x.id === selected.id ? { ...x, packUom: e.target.value } : x) }))} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DishesScreen(props: { db: DbState; setDb: React.Dispatch<React.SetStateAction<DbState>> }) {
  const { db, setDb } = props
  const [selectedId, setSelectedId] = useState<string>(db.dishes[0]?.id ?? '')
  const dish = db.dishes.find(d => d.id === selectedId) ?? null
  const ingredients = db.ingredients.filter(i => i.dishId === selectedId)

  function createDish() {
    const d: Dish = { id: Id.uid('dish'), name: 'Новое блюдо', defaultUom: 'pcs' }
    setDb(prev => ({ ...prev, dishes: [d, ...prev.dishes] }))
    setSelectedId(d.id)
  }
  function deleteDish(id: string) {
    if (!confirm('Удалить блюдо?')) return
    setDb(prev => ({
      ...prev,
      dishes: prev.dishes.filter(d => d.id !== id),
      ingredients: prev.ingredients.filter(i => i.dishId !== id),
      orderLines: prev.orderLines.filter(l => l.dishId !== id)
    }))
    setSelectedId(db.dishes.find(x => x.id !== id)?.id ?? '')
  }
  function addIngredient() {
    if (!dish) return
    if (db.items.length === 0) { alert('Сначала добавьте номенклатуру'); return }
    const ing: DishIngredient = { id: Id.uid('ing'), dishId: dish.id, itemId: db.items[0].id, cookedPerUnit: 0, cookedUom: 'kg', yieldRawToCooked: 1, yieldPurchaseToRaw: 1, roundToPack: false }
    setDb(prev => ({ ...prev, ingredients: [ing, ...prev.ingredients] }))
  }

  return (
    <div className="split">
      <div className="card pad">
        <SectionTitle title="Блюда" subtitle="Норма вводится в ГОТОВОМ виде (после термо)." right={<button className="btn primary" onClick={createDish}>+ Добавить</button>} />
        <div className="list">
          {db.dishes.map(d => (
            <div key={d.id} className="itemRow" style={{ borderColor: d.id === selectedId ? 'rgba(78,161,255,.5)' : undefined }}>
              <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => setSelectedId(d.id)}>
                <div className="title">{d.name}</div>
                <div className="meta">База: {d.defaultUom}</div>
              </div>
              <button className="btn danger" onClick={() => deleteDish(d.id)}>Удалить</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card pad">
        <SectionTitle title="Карточка блюда" subtitle="Ингредиенты рассчитываются в закупку автоматически." right={<button className="btn primary" onClick={addIngredient} disabled={!dish}>+ Ингредиент</button>} />
        {!dish ? <EmptyState title="Выберите блюдо" /> : (
          <>
            <div className="grid two">
              <div style={{ gridColumn:'1 / -1' }}>
                <div className="label">Название</div>
                <input className="input" value={dish.name} onChange={e => setDb(prev => ({ ...prev, dishes: prev.dishes.map(x => x.id === dish.id ? { ...x, name: e.target.value } : x) }))} />
              </div>
              <div>
                <div className="label">Базовая ед. блюда</div>
                <select value={dish.defaultUom} onChange={e => setDb(prev => ({ ...prev, dishes: prev.dishes.map(x => x.id === dish.id ? { ...x, defaultUom: e.target.value as Uom } : x) }))}>
                  {UOMS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
                <div className="small">MVP: заказ считается как количество “единиц блюда”. Конверсию единиц добавим дальше.</div>
              </div>
              <div />
            </div>

            <div style={{ marginTop: 14 }}>
              <SectionTitle title="Ингредиенты на 1 единицу блюда" subtitle="Готовое / 1 ед. + коэффициенты выхода." />
              {ingredients.length === 0 ? <div className="small muted">Добавьте ингредиенты.</div> : (
                <table className="table">
                  <thead><tr><th>Покупаем</th><th style={{ width: 170 }}>Готовое / 1 ед.</th><th style={{ width: 120 }}>Выход</th><th style={{ width: 120 }}>Чистка</th><th style={{ width: 120 }}>Округл.</th><th style={{ width: 90 }}></th></tr></thead>
                  <tbody>
                    {ingredients.map(ing => (
                      <tr key={ing.id}>
                        <td>
                          <select value={ing.itemId} onChange={e => setDb(prev => ({ ...prev, ingredients: prev.ingredients.map(x => x.id === ing.id ? { ...x, itemId: e.target.value } : x) }))}>
                            {db.items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                          </select>
                          <div className="small">поставщик: {db.items.find(i => i.id === ing.itemId)?.supplier ?? '—'}</div>
                        </td>
                        <td>
                          <div style={{ display:'flex', gap:8 }}>
                            <input className="input" type="number" step="0.001" value={ing.cookedPerUnit}
                              onChange={e => setDb(prev => ({ ...prev, ingredients: prev.ingredients.map(x => x.id === ing.id ? { ...x, cookedPerUnit: Number(e.target.value || 0) } : x) }))} />
                            <select value={ing.cookedUom} onChange={e => setDb(prev => ({ ...prev, ingredients: prev.ingredients.map(x => x.id === ing.id ? { ...x, cookedUom: e.target.value as Uom } : x) }))}>
                              {UOMS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                            </select>
                          </div>
                        </td>
                        <td><input className="input" type="number" step="0.001" value={ing.yieldRawToCooked}
                          onChange={e => setDb(prev => ({ ...prev, ingredients: prev.ingredients.map(x => x.id === ing.id ? { ...x, yieldRawToCooked: Number(e.target.value || 1) } : x) }))} /></td>
                        <td><input className="input" type="number" step="0.001" value={ing.yieldPurchaseToRaw}
                          onChange={e => setDb(prev => ({ ...prev, ingredients: prev.ingredients.map(x => x.id === ing.id ? { ...x, yieldPurchaseToRaw: Number(e.target.value || 1) } : x) }))} /></td>
                        <td>
                          <label style={{ display:'flex', gap:8, alignItems:'center' }}>
                            <input type="checkbox" checked={ing.roundToPack} onChange={e => setDb(prev => ({ ...prev, ingredients: prev.ingredients.map(x => x.id === ing.id ? { ...x, roundToPack: e.target.checked } : x) }))} />
                            <span className="small">до уп.</span>
                          </label>
                        </td>
                        <td><button className="btn danger" onClick={() => setDb(prev => ({ ...prev, ingredients: prev.ingredients.filter(x => x.id !== ing.id) }))}>Удалить</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
