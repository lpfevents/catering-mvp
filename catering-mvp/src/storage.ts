import type { CatalogItem, Dish, DishIngredient, Order, OrderLine } from './types'
const KEY = 'catering_mvp_v1'

export interface DbState {
  items: CatalogItem[]
  dishes: Dish[]
  ingredients: DishIngredient[]
  orders: Order[]
  orderLines: OrderLine[]
  boughtByOrder: Record<string, Record<string, boolean>>
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}
export const Id = { uid }

export function loadState(): DbState {
  const raw = localStorage.getItem(KEY)
  if (!raw) return seed()
  try {
    const p = JSON.parse(raw) as DbState
    return {
      items: p.items ?? [],
      dishes: p.dishes ?? [],
      ingredients: p.ingredients ?? [],
      orders: p.orders ?? [],
      orderLines: p.orderLines ?? [],
      boughtByOrder: p.boughtByOrder ?? {}
    }
  } catch { return seed() }
}

export function saveState(state: DbState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function seed(): DbState {
  const items: CatalogItem[] = [
    { id: 'item_chicken', name: 'Куриное филе', type: 'food', uom: 'kg', packSize: 2, packUom: 'уп', supplier: 'МясоОпт' },
    { id: 'item_mush', name: 'Шампиньоны', type: 'food', uom: 'kg', packSize: null, packUom: null, supplier: 'ОвощиБаза' },
    { id: 'item_cream', name: 'Сливки 20%', type: 'food', uom: 'l', packSize: null, packUom: null, supplier: 'Молочка' },
    { id: 'item_cup', name: 'Контейнер 750 мл', type: 'packaging', uom: 'pcs', packSize: 50, packUom: 'пач', supplier: 'Одноразка' },
  ]
  const dishes: Dish[] = [
    { id: 'dish_julien', name: 'Жульен классический', defaultUom: 'pcs' },
    { id: 'dish_kebab', name: 'Шашлык куриный', defaultUom: 'pcs' },
  ]
  const ingredients: DishIngredient[] = [
    { id: 'ing_j1', dishId: 'dish_julien', itemId: 'item_mush', cookedPerUnit: 0.08, cookedUom: 'kg', yieldRawToCooked: 1.0, yieldPurchaseToRaw: 0.95, roundToPack: false, note: '80г готовых грибов на 1 шт' },
    { id: 'ing_j2', dishId: 'dish_julien', itemId: 'item_cream', cookedPerUnit: 0.05, cookedUom: 'l', yieldRawToCooked: 1.0, yieldPurchaseToRaw: 1.0, roundToPack: false },
    { id: 'ing_j3', dishId: 'dish_julien', itemId: 'item_cup', cookedPerUnit: 1.0, cookedUom: 'pcs', yieldRawToCooked: 1.0, yieldPurchaseToRaw: 1.0, roundToPack: true, note: '1 контейнер на 1 шт' },
    { id: 'ing_k1', dishId: 'dish_kebab', itemId: 'item_chicken', cookedPerUnit: 0.12, cookedUom: 'kg', yieldRawToCooked: 0.75, yieldPurchaseToRaw: 1.0, roundToPack: true, note: '120г готовой курицы на 1 шт' },
  ]
  const orders = [{ id: 'order_001', dateISO: new Date().toISOString().slice(0,10), client: 'Тестовый клиент', note: '' }]
  const orderLines: OrderLine[] = [
    { id: 'ol_1', orderId: 'order_001', dishId: 'dish_julien', qty: 50, uom: 'pcs' },
    { id: 'ol_2', orderId: 'order_001', dishId: 'dish_kebab', qty: 30, uom: 'pcs' },
  ]
  return { items, dishes, ingredients, orders, orderLines, boughtByOrder: {} }
}
