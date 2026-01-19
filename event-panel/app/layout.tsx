import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Event Panel',
  description: 'Online panel for managing events: budget, tasks, riders, catering.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
