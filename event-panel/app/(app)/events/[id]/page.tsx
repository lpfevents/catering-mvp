import { redirect } from 'next/navigation'

export default function EventRoot({ params }: { params: { id: string } }) {
  redirect(`/events/${params.id}/dashboard`)
}
