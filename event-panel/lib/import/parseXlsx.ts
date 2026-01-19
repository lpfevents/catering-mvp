import * as XLSX from 'xlsx'

type ParsedEventMeta = {
  name?: string
  date?: string
  location?: string
  guests?: number
}

export type ParsedBudgetItem = {
  category: string
  title: string
  unit?: string
  qty: number
  price: number
  total_amount: number
}

export type ParsedPayment = {
  // planned or paid
  budgetKey: string
  amount: number
  status: 'planned' | 'paid'
  due_date?: string
}

export type ParsedMenuItem = {
  menu_type: 'guest' | 'staff'
  position: string
  unit?: string
  qty: number
  price: number
  total_amount: number
  weight_g: number
  total_weight_g: number
  note?: string
}

export type ParsedTask = {
  title: string
  description?: string
  due_at?: string
  assignee_name?: string
  assignee_phone?: string
}

export type ParsedRiderDoc = {
  title: string
  raw_text: string
  items: { section: string; text: string; severity?: 'normal' | 'critical' }[]
}

export type ParsedWorkbook = {
  meta: ParsedEventMeta
  budgetItems: ParsedBudgetItem[]
  payments: ParsedPayment[]
  menuItems: ParsedMenuItem[]
  tasks: ParsedTask[]
  riderDocs: ParsedRiderDoc[]
}

function asNumber(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v === 'boolean') return v ? 1 : 0
  const s = String(v).replace(/\s/g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function sheetToRows(wb: XLSX.WorkBook, sheetName: string): any[][] {
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][]
}

function findHeaderRow(rows: any[][], headerNeedle: string): number {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || []
    if (row.some((c) => typeof c === 'string' && c.toLowerCase().includes(headerNeedle.toLowerCase()))) {
      return i
    }
  }
  return -1
}

function parseMainMeta(rows: any[][]): ParsedEventMeta {
  const meta: ParsedEventMeta = {}
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const a = asString(rows[i]?.[0])
    if (!a) continue
    if (i === 1 && a) meta.name = a
    if (a.toLowerCase().startsWith('data:')) meta.date = a.replace(/^data:\s*/i, '').trim()
    if (a.toLowerCase().startsWith('date:')) meta.date = a.replace(/^date:\s*/i, '').trim()
    if (a.toLowerCase().startsWith('location:')) meta.location = a.replace(/^location:\s*/i, '').trim()
    if (a.toLowerCase().includes('number of people')) {
      const g = asNumber(rows[i]?.[2])
      if (g) meta.guests = Math.round(g)
    }
  }
  return meta
}

function parseBudgetLikeTable(rows: any[][], defaultCategory: string): ParsedBudgetItem[] {
  const out: ParsedBudgetItem[] = []
  const headerRow = findHeaderRow(rows, 'Position')
  if (headerRow < 0) return out
  let category = defaultCategory
  for (let i = headerRow + 1; i < rows.length; i++) {
    const r = rows[i] || []
    const idx = r[0]
    const position = asString(r[1])
    const unit = asString(r[2]) || undefined
    const qty = asNumber(r[3])
    const price = asNumber(r[4])
    const total = asNumber(r[5]) || qty * price

    // stop if we hit long empty area
    if (!position && !asString(idx) && qty === 0 && price === 0 && total === 0) {
      // if next few rows are also empty, break
      let emptyStreak = 0
      for (let k = i; k < Math.min(i + 8, rows.length); k++) {
        const rr = rows[k] || []
        const has = asString(rr[1]) || asString(rr[0]) || asString(rr[2])
        if (!has && asNumber(rr[3]) === 0 && asNumber(rr[4]) === 0 && asNumber(rr[5]) === 0) emptyStreak++
      }
      if (emptyStreak >= 6) break
      continue
    }

    // Category marker rows usually have no # and no numbers
    const isCategoryRow = !asString(idx) && position && qty === 0 && price === 0 && total === 0
    if (isCategoryRow) {
      category = position.replace(/:$/, '').trim() || category
      continue
    }

    if (!position) continue

    out.push({
      category,
      title: position,
      unit,
      qty,
      price,
      total_amount: total,
    })
  }
  return out
}

function parseDecor(rows: any[][]): { items: ParsedBudgetItem[]; payments: ParsedPayment[] } {
  const items: ParsedBudgetItem[] = []
  const payments: ParsedPayment[] = []

  // Find the row where column A == 'Статья расходов'
  let header = -1
  for (let i = 0; i < rows.length; i++) {
    if (asString(rows[i]?.[0]).toLowerCase().includes('статья')) {
      header = i
      break
    }
  }
  if (header < 0) return { items, payments }

  let category = 'Decor'
  for (let i = header + 2; i < rows.length; i++) {
    const r = rows[i] || []
    const title = asString(r[0])
    const price = asNumber(r[1])
    const qty = asNumber(r[2])
    const total = asNumber(r[3]) || qty * price
    const paid = asNumber(r[4])
    const remain = asNumber(r[5])

    if (!title && price === 0 && qty === 0 && total === 0 && paid === 0 && remain === 0) {
      let emptyStreak = 0
      for (let k = i; k < Math.min(i + 8, rows.length); k++) {
        const rr = rows[k] || []
        if (!asString(rr[0]) && asNumber(rr[1]) === 0 && asNumber(rr[2]) === 0 && asNumber(rr[3]) === 0) emptyStreak++
      }
      if (emptyStreak >= 6) break
      continue
    }

    const isSection = title && price === 0 && qty === 0 && total === 0
    if (isSection) {
      category = `Decor / ${title}`
      continue
    }
    if (!title) continue

    const key = `${category}::${title}`
    items.push({
      category,
      title,
      unit: undefined,
      qty,
      price,
      total_amount: total,
    })
    if (paid > 0) payments.push({ budgetKey: key, amount: paid, status: 'paid' })
    if (remain > 0) payments.push({ budgetKey: key, amount: remain, status: 'planned' })
  }

  return { items, payments }
}

function parseMenuSheet(rows: any[][], menu_type: 'guest' | 'staff'): ParsedMenuItem[] {
  const out: ParsedMenuItem[] = []
  // header contains 'Позиция'
  const header = findHeaderRow(rows, 'Позиция')
  if (header < 0) return out
  for (let i = header + 1; i < rows.length; i++) {
    const r = rows[i] || []
    const position = asString(r[1])
    const unit = asString(r[2]) || undefined
    const qty = asNumber(r[3])
    const price = asNumber(r[4])
    const total = asNumber(r[5]) || qty * price
    const note = asString(r[6]) || undefined
    const weight = asNumber(r[7])
    const totalWeight = asNumber(r[8]) || weight * qty

    if (!position && qty === 0 && price === 0 && total === 0 && !note) {
      let emptyStreak = 0
      for (let k = i; k < Math.min(i + 8, rows.length); k++) {
        const rr = rows[k] || []
        if (!asString(rr[1]) && asNumber(rr[3]) === 0 && asNumber(rr[4]) === 0) emptyStreak++
      }
      if (emptyStreak >= 6) break
      continue
    }
    if (!position) continue

    out.push({
      menu_type,
      position,
      unit,
      qty,
      price,
      total_amount: total,
      weight_g: weight,
      total_weight_g: totalWeight,
      note,
    })
  }
  return out
}

function extractNamePhone(s: string): { name?: string; phone?: string } {
  const cleaned = s.replace(/\s+/g, ' ').trim()
  const m = cleaned.match(/^(.*?)(?:\s*[-:]\s*)?(\+?\d[\d\s]{6,})$/)
  if (m) {
    const name = m[1].replace(/:$/, '').trim()
    const phone = m[2].replace(/\s/g, '')
    return { name: name || undefined, phone: phone || undefined }
  }
  // sometimes like "Валентин:"
  const m2 = cleaned.match(/^(.*?):$/)
  if (m2) return { name: m2[1].trim() }
  return { name: cleaned || undefined }
}

function formatTimeCell(v: any): string {
  if (v instanceof Date) {
    const hh = String(v.getHours()).padStart(2, '0')
    const mm = String(v.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }
  // xlsx sometimes gives a number for time
  if (typeof v === 'number') {
    const totalMinutes = Math.round(v * 24 * 60)
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const mm = String(totalMinutes % 60).padStart(2, '0')
    return `${hh}:${mm}`
  }
  return asString(v)
}

function parseTiming(rows: any[][]): ParsedTask[] {
  const tasks: ParsedTask[] = []
  let currentDateLabel = ''
  let currentAssigneeName: string | undefined
  let currentAssigneePhone: string | undefined

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || []
    const colA = asString(r[0])
    const colB = r[1]
    const colC = asString(r[2])
    const colD = asString(r[3])

    // date headings like '05 Сентября'
    if (colA && /\d{1,2}\s+\p{L}+/u.test(colA) && colA.length < 25) {
      currentDateLabel = colA
      continue
    }

    // assignee label like 'Валентин:' in column B
    if (asString(colB) && asString(colB).endsWith(':') && !colC) {
      const ap = extractNamePhone(asString(colB))
      currentAssigneeName = ap.name
      currentAssigneePhone = ap.phone
      continue
    }

    // contacts sections early in the sheet (phone + name)
    if (!colA && asString(colB) && colC && !colD) {
      const maybePhone = asString(colB)
      const phoneDigits = maybePhone.replace(/\D/g, '')
      if (phoneDigits.length >= 7) {
        // treat as contact line (not a task)
        continue
      }
    }

    // If colA has name-phone like 'Лона - 555...'
    if (colA && /\d/.test(colA) && !/\d{1,2}\s+\p{L}+/u.test(colA)) {
      const ap = extractNamePhone(colA)
      currentAssigneeName = ap.name
      currentAssigneePhone = ap.phone
    }

    const title = colC
    if (!title) continue

    const timeLabel = formatTimeCell(colB)
    const due_at = [currentDateLabel, timeLabel].filter(Boolean).join(' ').trim() || undefined
    const description = colD || undefined

    tasks.push({
      title,
      description,
      due_at,
      assignee_name: currentAssigneeName,
      assignee_phone: currentAssigneePhone,
    })
  }
  return tasks
}

function parseRiderLikeSheet(sheetName: string, rows: any[][]): ParsedRiderDoc {
  const lines: string[] = []
  for (const r of rows) {
    const line = r.map(asString).filter(Boolean).join(' ').trim()
    if (line) lines.push(line)
  }
  const raw_text = lines.join('\n')
  // naive split into items: each non-empty line becomes an item
  const items = lines
    .filter((l) => l.length > 2)
    .slice(0, 400)
    .map((l) => ({ section: 'General', text: l, severity: /must|required|обязательно/i.test(l) ? 'critical' : 'normal' as const }))

  return { title: sheetName, raw_text, items }
}

export function parseEstimateXlsx(buffer: ArrayBuffer): ParsedWorkbook {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetNames = wb.SheetNames

  const budgetItems: ParsedBudgetItem[] = []
  const payments: ParsedPayment[] = []
  const menuItems: ParsedMenuItem[] = []
  const tasks: ParsedTask[] = []
  const riderDocs: ParsedRiderDoc[] = []

  // META
  const mainRows = sheetToRows(wb, 'Main')
  const meta = mainRows.length ? parseMainMeta(mainRows) : {}

  // MAIN budget
  if (mainRows.length) budgetItems.push(...parseBudgetLikeTable(mainRows, 'Main'))

  // DECOR
  if (sheetNames.includes('Decor')) {
    const decorRows = sheetToRows(wb, 'Decor')
    const parsed = parseDecor(decorRows)
    // decorate keys for payments
    // We'll keep payments with a temporary key. The importer will map it to budget_item_id.
    budgetItems.push(...parsed.items)
    payments.push(...parsed.payments)
  }

  // DRINKS (budget-like)
  if (sheetNames.includes('Drinks')) {
    const rows = sheetToRows(wb, 'Drinks')
    budgetItems.push(...parseBudgetLikeTable(rows, 'Drinks'))
  }

  // STAFF & STAFF FOOD (budget-like but different header)
  if (sheetNames.includes('Staff and Staff Food')) {
    const rows = sheetToRows(wb, 'Staff and Staff Food')
    // this sheet also contains Position/Units/Quantity/Price/Total, just with extra column
    budgetItems.push(...parseBudgetLikeTable(rows, 'Staff Food'))
  }

  // STAFF FROM VENUE
  if (sheetNames.includes('Staff from venue')) {
    const rows = sheetToRows(wb, 'Staff from venue')
    budgetItems.push(...parseBudgetLikeTable(rows, 'Venue Staff'))
  }

  // MENU sheets (optional)
  for (const sn of sheetNames) {
    if (sn.toLowerCase() === 'меню') {
      menuItems.push(...parseMenuSheet(sheetToRows(wb, sn), 'guest'))
    }
    if (sn.toLowerCase().includes('меню') && sn.toLowerCase().includes('стафф')) {
      menuItems.push(...parseMenuSheet(sheetToRows(wb, sn), 'staff'))
    }
  }

  // RIDERS (optional)
  for (const sn of sheetNames) {
    if (/^rider/i.test(sn) || sn.toLowerCase().includes('райдер')) {
      riderDocs.push(parseRiderLikeSheet(sn, sheetToRows(wb, sn)))
    }
  }

  // TIMELINE
  const timingName = sheetNames.find((s) => s.toLowerCase().includes('тайминг'))
  if (timingName) {
    tasks.push(...parseTiming(sheetToRows(wb, timingName)))
  }

  return { meta, budgetItems, payments, menuItems, tasks, riderDocs }
}
