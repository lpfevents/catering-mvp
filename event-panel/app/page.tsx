import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  if (data.session) redirect('/events')
  redirect('/login')
}
