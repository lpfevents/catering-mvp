import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseEstimateXlsx } from '@/lib/import/parseXlsx'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const overrideName = String(form.get('event_name') ?? '').trim()
  const overrideDate = String(form.get('event_date') ?? '').trim()
  const overrideLocation = String(form.get('event_location') ?? '').trim()
  const overrideGuests = String(form.get('event_guests') ?? '').trim()

  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return NextResponse.json({ error: 'Only .xlsx is supported' }, { status: 400 })
  }

  const buf = await file.arrayBuffer()
  const parsed = parseEstimateXlsx(buf)

  const eventPayload = {
    owner_id: user.id,
    name: overrideName || parsed.meta.name || 'Imported event',
    date: overrideDate || parsed.meta.date || '',
    location: overrideLocation || parsed.meta.location || null,
    guests: overrideGuests ? Number(overrideGuests) || null : parsed.meta.guests ?? null,
  }

  if (!eventPayload.date) {
    // keep a non-empty value for schema constraint
    eventPayload.date = new Date().toISOString().slice(0, 10)
  }

  const { data: ev, error: evErr } = await supabase.from('events').insert(eventPayload).select('id').single()
  if (evErr || !ev) return NextResponse.json({ error: evErr?.message || 'Failed to create event' }, { status: 500 })

  const event_id = ev.id as string

  // Insert budget items
  const budgetRows = parsed.budgetItems.map((b) => ({ ...b, event_id, owner_id: user.id }))
  const budgetKeyToId = new Map<string, string>()

  if (budgetRows.length) {
    const { data: inserted, error } = await supabase
      .from('budget_items')
      .insert(budgetRows)
      .select('id, category, title')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const it of inserted || []) {
      const key = `${it.category}::${it.title}`
      budgetKeyToId.set(key, it.id)
    }
  }

  // Insert payments (only those we can map)
  const paymentRows = parsed.payments
    .map((p) => {
      const budget_item_id = budgetKeyToId.get(p.budgetKey)
      if (!budget_item_id) return null
      return {
        event_id,
        owner_id: user.id,
        budget_item_id,
        amount: p.amount,
        due_date: p.due_date ?? null,
        status: p.status,
      }
    })
    .filter(Boolean)

  if (paymentRows.length) {
    const { error } = await supabase.from('payments').insert(paymentRows as any)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Menu
  const menuRows = parsed.menuItems.map((m) => ({ ...m, event_id, owner_id: user.id }))
  if (menuRows.length) {
    const { error } = await supabase.from('menu_items').insert(menuRows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Tasks
  const taskRows = parsed.tasks.map((t) => ({ ...t, event_id, owner_id: user.id }))
  if (taskRows.length) {
    const { error } = await supabase.from('tasks').insert(taskRows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Rider docs + items
  for (const doc of parsed.riderDocs) {
    const { data: d, error: dErr } = await supabase
      .from('rider_docs')
      .insert({ event_id, owner_id: user.id, title: doc.title, raw_text: doc.raw_text })
      .select('id')
      .single()
    if (dErr || !d) return NextResponse.json({ error: dErr?.message || 'Failed to insert rider doc' }, { status: 500 })

    const items = doc.items.map((it) => ({
      event_id,
      owner_id: user.id,
      rider_doc_id: d.id,
      section: it.section,
      text: it.text,
      severity: it.severity ?? 'normal',
      provider: 'vendor',
      status: 'requested',
      due_date: null,
    }))
    if (items.length) {
      const { error } = await supabase.from('rider_items').insert(items)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, event_id })
}
