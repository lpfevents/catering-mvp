'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const RiderDocSchema = z.object({
  title: z.string().min(2),
  raw_text: z.string().min(10),
})

export async function addRiderDoc(eventId: string, formData: FormData) {
  const parsed = RiderDocSchema.safeParse({
    title: formData.get('title'),
    raw_text: formData.get('raw_text'),
  })
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(', '))

  const supabase = createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  const { error } = await supabase.from('rider_docs').insert({
    event_id: eventId,
    owner_id: user.user.id,
    title: parsed.data.title,
    raw_text: parsed.data.raw_text,
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/events/${eventId}/riders`)
}

const RiderItemSchema = z.object({
  rider_doc_id: z.string().uuid(),
  section: z.string().min(1),
  text: z.string().min(1),
  severity: z.enum(['normal','critical']).default('normal'),
  provider: z.enum(['venue','vendor','artist','us']).default('vendor'),
  due_date: z.string().optional(),
})

export async function addRiderItem(eventId: string, formData: FormData) {
  const parsed = RiderItemSchema.safeParse({
    rider_doc_id: formData.get('rider_doc_id'),
    section: formData.get('section'),
    text: formData.get('text'),
    severity: formData.get('severity') || 'normal',
    provider: formData.get('provider') || 'vendor',
    due_date: formData.get('due_date') || undefined,
  })
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(', '))

  const supabase = createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  const { error } = await supabase.from('rider_items').insert({
    event_id: eventId,
    owner_id: user.user.id,
    rider_doc_id: parsed.data.rider_doc_id,
    section: parsed.data.section,
    text: parsed.data.text,
    severity: parsed.data.severity,
    provider: parsed.data.provider,
    due_date: parsed.data.due_date ?? null,
    status: 'requested',
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/events/${eventId}/riders`)
}
