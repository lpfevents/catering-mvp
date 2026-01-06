export type Uom = 'pcs' | 'portion' | 'kg' | 'l'
export type ItemType = 'food' | 'packaging' | 'inventory' | 'other'

export interface CatalogItem {
  id: string
  name: string
  type: ItemType
  uom: Uom
  packSize: number | null
  packUom: string | null
  supplier: string | null
}

export interface Dish { id: string; name: string; defaultUom: Uom }

export interface DishIngredient {
  id: string
  dishId: string
  itemId: string
  cookedPerUnit: number
  cookedUom: Uom
  yieldRawToCooked: number
  yieldPurchaseToRaw: number
  roundToPack: boolean
  note?: string
}

export interface Order { id: string; dateISO: string; client?: string; note?: string }

export interface OrderLine { id: string; orderId: string; dishId: string; qty: number; uom: Uom }

export interface PurchaseLine {
  itemId: string
  itemName: string
  supplier: string | null
  uom: Uom
  qtyExact: number
  qtyRounded: number
  packs: number | null
  packSize: number | null
  packUom: string | null
  bought: boolean
  comment: string
}
