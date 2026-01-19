'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const MenuSchema = z.object({
  menu_type: z.enum(['guest','staff']).default('guest'),
  position: z.string().min(1),
  unit: z.string().optional(),
  qty: z.coerce.number().nonnegative().optional(),
  price: z.coerce.number().nonnegative().optional(),
  weight_g: z.coerce.number().nonnegative().optional(),
  note: z.string().optional(),
})

export async function addMenuItem(eventId: string, formData: FormData) {
  const parsed = MenuSchema.safeParse({
    menu_type: formData.get('menu_type') || 'guest',
    position: formData.get('position'),
    unit: formData.get('unit') || undefined,
    qty: formData.get('qty') || undefined,
    price: formData.get('price') || undefined,
    weight_g: formData.get('weight_g') || undefined,
    note: formData.get('note') || undefined,
  })
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(', '))

  const qty = parsed.data.qty ?? 0
  const price = parsed.data.price ?? 0
  const weight = parsed.data.weight_g ?? 0

  const supabase = createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  const { error } = await supabase.from('menu_items').insert({
    event_id: eventId,
    owner_id: user.user.id,
    menu_type: parsed.data.menu_type,
    position: parsed.data.position,
    unit: parsed.data.unit ?? null,
    qty,
    price,
    total_amount: qty * price,
    weight_g: weight,
    total_weight_g: qty * weight,
    note: parsed.data.note ?? null,
    status: 'draft',
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/events/${eventId}/catering`)
}
