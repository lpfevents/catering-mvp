'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const TaskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  due_at: z.string().optional(),
  status: z.enum(['todo','doing','done','overdue']).default('todo'),
  assignee_name: z.string().optional(),
  assignee_phone: z.string().optional(),
})

export async function addTask(eventId: string, formData: FormData) {
  const parsed = TaskSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    due_at: formData.get('due_at') || undefined,
    status: formData.get('status') || 'todo',
    assignee_name: formData.get('assignee_name') || undefined,
    assignee_phone: formData.get('assignee_phone') || undefined,
  })
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(', '))

  const supabase = createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  const { error } = await supabase.from('tasks').insert({
    event_id: eventId,
    owner_id: user.user.id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    due_at: parsed.data.due_at ?? null,
    status: parsed.data.status,
    assignee_name: parsed.data.assignee_name ?? null,
    assignee_phone: parsed.data.assignee_phone ?? null,
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/events/${eventId}/timeline`)
}
