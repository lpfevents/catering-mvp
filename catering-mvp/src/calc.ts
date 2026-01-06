import type { CatalogItem, Dish, DishIngredient, OrderLine, PurchaseLine, Uom } from './types'

function roundUpToPack(qty: number, packSize: number) {
  const packs = Math.ceil(qty / packSize)
  return { packs, qtyRounded: packs * packSize }
}
function fmtQty(n: number) {
  const abs = Math.abs(n)
  const s = abs >= 10 ? n.toFixed(1) : abs >= 1 ? n.toFixed(2) : n.toFixed(3)
  return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}
function uomLabel(uom: Uom) { return uom==='pcs'?'шт':uom==='portion'?'порц':uom==='kg'?'кг':'л' }

export function buildPurchaseList(params: {
  orderId: string
  items: CatalogItem[]
  dishes: Dish[]
  ingredients: DishIngredient[]
  lines: OrderLine[]
  boughtMap: Record<string, boolean> | undefined
}): PurchaseLine[] {
  const { orderId, items, dishes, ingredients, lines, boughtMap } = params
  const itemById = new Map(items.map(i => [i.id, i]))
  const dishById = new Map(dishes.map(d => [d.id, d]))

  const agg = new Map<string, { qty: number }>()
  for (const line of lines.filter(l => l.orderId === orderId)) {
    if (!dishById.get(line.dishId)) continue
    for (const ing of ingredients.filter(x => x.dishId === line.dishId)) {
      const item = itemById.get(ing.itemId); if (!item) continue
      const y1 = ing.yieldRawToCooked || 1
      const y2 = ing.yieldPurchaseToRaw || 1
      const purchasePerUnit = ing.cookedPerUnit / (y1 * y2)
      const qtyExact = purchasePerUnit * line.qty
      agg.set(item.id, { qty: (agg.get(item.id)?.qty ?? 0) + qtyExact })
    }
  }

  const out: PurchaseLine[] = []
  for (const [itemId, a] of agg.entries()) {
    const item = itemById.get(itemId)!
    const packSize = item.packSize ?? null
    const packUom = item.packUom ?? null

    let qtyRounded = a.qty
    let packs: number | null = null
    if (packSize && packSize > 0) {
      const r = roundUpToPack(a.qty, packSize)
      packs = r.packs
      qtyRounded = r.qtyRounded
    }
    const bought = !!(boughtMap && boughtMap[itemId])
    const commentForBuyer = packs && packUom && packSize
      ? `Купить ${packs} ${packUom} (по ${fmtQty(packSize)} ${uomLabel(item.uom)})`
      : `Купить ${fmtQty(a.qty)} ${uomLabel(item.uom)}`

    out.push({
      itemId,
      itemName: item.name,
      supplier: item.supplier ?? null,
      uom: item.uom,
      qtyExact: a.qty,
      qtyRounded,
      packs,
      packSize,
      packUom,
      bought,
      comment: commentForBuyer
    })
  }

  out.sort((x,y)=>(x.supplier??'').localeCompare(y.supplier??'')||x.itemName.localeCompare(y.itemName))
  return out
}
