'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const BudgetSchema = z.object({
  category: z.string().min(1),
  title: z.string().min(1),
  unit: z.string().optional(),
  qty: z.coerce.number().nonnegative().optional(),
  price: z.coerce.number().nonnegative().optional(),
})

export async function addBudgetItem(eventId: string, formData: FormData) {
  const parsed = BudgetSchema.safeParse({
    category: formData.get('category'),
    title: formData.get('title'),
    unit: formData.get('unit') || undefined,
    qty: formData.get('qty') || undefined,
    price: formData.get('price') || undefined,
  })
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(', '))

  const qty = parsed.data.qty ?? 0
  const price = parsed.data.price ?? 0
  const total = qty * price

  const supabase = createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  const { error } = await supabase.from('budget_items').insert({
    event_id: eventId,
    owner_id: user.user.id,
    category: parsed.data.category,
    title: parsed.data.title,
    unit: parsed.data.unit ?? null,
    qty,
    price,
    total_amount: total,
    status: 'draft',
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/events/${eventId}/budget`)
}

const PaymentSchema = z.object({
  budget_item_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  due_date: z.string().optional(),
  status: z.enum(['planned','paid']).default('planned'),
})

export async function addPayment(eventId: string, formData: FormData) {
  const parsed = PaymentSchema.safeParse({
    budget_item_id: formData.get('budget_item_id'),
    amount: formData.get('amount'),
    due_date: formData.get('due_date') || undefined,
    status: formData.get('status') || 'planned',
  })
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(', '))

  const supabase = createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  const { error } = await supabase.from('payments').insert({
    event_id: eventId,
    owner_id: user.user.id,
    budget_item_id: parsed.data.budget_item_id,
    amount: parsed.data.amount,
    due_date: parsed.data.due_date ?? null,
    status: parsed.data.status,
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/events/${eventId}/budget`)
}
