'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup' | 'magic'

export default function LoginPage() {
  const router = useRouter()
  const search = useSearchParams()
  const nextPath = useMemo(() => search.get('next') || '/events', [search])
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string>('')

  async function onMagic(e: React.FormEvent) {
    e.preventDefault()
    setStatus('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}${nextPath}`
            : undefined,
      },
    })
    if (error) return setStatus(error.message)
    setStatus('Ссылка отправлена на почту.')
  }

  async function onPassword(e: React.FormEvent) {
    e.preventDefault()
    setStatus('')
    if (!email || !password) {
      setStatus('Введите email и пароль.')
      return
    }

    const fn = mode === 'signup' ? supabase.auth.signUp : supabase.auth.signInWithPassword
    // @ts-expect-error supabase types differ slightly
    const { error } = await fn({ email, password })

    if (error) return setStatus(error.message)
    router.push(nextPath)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Event Panel</h1>
          <p className="text-slate-600 text-sm">Вход в систему управления ивентами</p>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            className={`px-3 py-2 rounded-lg text-sm border ${mode === 'magic' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'}`}
            onClick={() => setMode('magic')}
          >
            Magic link
          </button>
          <button
            className={`px-3 py-2 rounded-lg text-sm border ${mode === 'login' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'}`}
            onClick={() => setMode('login')}
          >
            Пароль
          </button>
          <button
            className={`px-3 py-2 rounded-lg text-sm border ${mode === 'signup' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'}`}
            onClick={() => setMode('signup')}
          >
            Регистрация
          </button>
        </div>

        <form className="mt-6 space-y-3" onSubmit={mode === 'magic' ? onMagic : onPassword}>
          <label className="block">
            <span className="text-sm text-slate-700">Email</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
            />
          </label>

          {mode !== 'magic' && (
            <label className="block">
              <span className="text-sm text-slate-700">Пароль</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
          )}

          <button className="w-full rounded-lg bg-slate-900 text-white py-2">
            {mode === 'magic' ? 'Отправить ссылку' : mode === 'signup' ? 'Создать аккаунт' : 'Войти'}
          </button>

          {status && <p className="text-sm text-slate-700">{status}</p>}

          <p className="text-xs text-slate-500">
            Для продакшн: включите RLS в Supabase и используйте роли/права. Схема БД лежит в db/schema.sql.
          </p>
        </form>
      </div>
    </div>
  )
}
