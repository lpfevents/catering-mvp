'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/Card'

export default function ImportEventPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!file) {
      setError('Выберите .xlsx файл')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData(e.currentTarget)
      fd.set('file', file)

      const res = await fetch('/api/import/xlsx', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Import failed')
      router.push(`/events/${json.event_id}`)
    } catch (err: any) {
      setError(err?.message || 'Ошибка импорта')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Импорт ивента из Excel</h1>
      </div>

      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium">Файл .xlsx</label>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full"
              required
            />
            <p className="text-xs text-neutral-500">Поддерживаются листы: Main, Decor, Drinks, Staff and Staff Food, Staff from venue, Тайминг для стаффа. Если есть Меню/Райдеры — тоже подтянет.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Название ивента (необязательно)</label>
              <input name="event_name" className="w-full rounded-xl border px-3 py-2" placeholder="Например: NY Party" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Дата (необязательно)</label>
              <input name="event_date" className="w-full rounded-xl border px-3 py-2" placeholder="Например: 07.02.2026" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Локация (необязательно)</label>
              <input name="event_location" className="w-full rounded-xl border px-3 py-2" placeholder="Le Ciel" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Гостей (необязательно)</label>
              <input name="event_guests" inputMode="numeric" className="w-full rounded-xl border px-3 py-2" placeholder="120" />
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            disabled={loading}
            className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? 'Импортируем…' : 'Импортировать'}
          </button>
        </form>
      </Card>
    </div>
  )
}
