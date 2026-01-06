import * as XLSX from 'xlsx'
import type { PurchaseLine, CatalogItem, Dish, DishIngredient, Order, OrderLine } from './types'

export function exportPurchaseXlsx(lines: PurchaseLine[], filename: string) {
  const rows = lines.map(l => ({
    'Статус': l.bought ? 'КУПЛЕНО' : 'НУЖНО',
    'Позиция': l.itemName,
    'Поставщик': l.supplier ?? '',
    'Ед.': l.uom,
    'Нужно (точно)': l.qtyExact,
    'Нужно (округл.)': l.qtyRounded,
    'Упаковок': l.packs ?? '',
    'Упаковка': l.packUom ?? '',
    'Размер упаковки': l.packSize ?? '',
    'Комментарий': l.comment
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Закупка')
  XLSX.writeFile(wb, filename)
}

export function exportDbXlsx(payload: {
  items: CatalogItem[]
  dishes: Dish[]
  ingredients: DishIngredient[]
  orders: Order[]
  orderLines: OrderLine[]
}, filename: string) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payload.items), 'Catalog')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payload.dishes), 'Dishes')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payload.ingredients), 'DishIngredients')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payload.orders), 'Orders')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payload.orderLines), 'OrderLines')
  XLSX.writeFile(wb, filename)
}

export function importDbXlsx(file: File): Promise<Partial<any>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const get = (name: string) => wb.Sheets[name] ? XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null }) : undefined
        resolve({
          items: get('Catalog'),
          dishes: get('Dishes'),
          ingredients: get('DishIngredients'),
          orders: get('Orders'),
          orderLines: get('OrderLines'),
        })
      } catch (e: any) { reject(new Error(e?.message ?? 'Ошибка импорта')) }
    }
    reader.readAsArrayBuffer(file)
  })
}
