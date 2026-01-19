'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateEventSchema = z.object({
  name: z.string().min(2),
  date: z.string().min(4),
  location: z.string().optional(),
  guests: z.coerce.number().int().min(0).optional(),
})

export async function createEvent(formData: FormData) {
  const parsed = CreateEventSchema.safeParse({
    name: formData.get('name'),
    date: formData.get('date'),
    location: formData.get('location') || undefined,
    guests: formData.get('guests') || undefined,
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(', '))
  }

  const supabase = createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  const { error } = await supabase.from('events').insert({
    name: parsed.data.name,
    date: parsed.data.date,
    location: parsed.data.location ?? null,
    guests: parsed.data.guests ?? null,
    owner_id: user.user.id,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/events')
}
