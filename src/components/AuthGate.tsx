'use client'

import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import NavBar from '@/components/NavBar'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession)
        setCheckingSession(false)
      }
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setErrorMessage('No se pudo comprobar la sesión. Recarga la página e inténtalo de nuevo.')
      setSession(data.session)
      setCheckingSession(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) setErrorMessage('No se pudo iniciar sesión. Comprueba el correo y la contraseña.')
    } catch {
      setErrorMessage('No se pudo conectar con el servicio de acceso. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 text-sm text-slate-400" aria-live="polite">
        Comprobando acceso…
      </main>
    )
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-10 text-slate-100">
        <form onSubmit={handleSignIn} className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl sm:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">Acceso privado</p>
          <h1 className="text-2xl font-semibold text-white">Cartera</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Inicia sesión con la cuenta de propietario configurada en Supabase.</p>

          <label className="mt-6 grid gap-2 text-sm text-slate-300">
            Correo electrónico
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white"
            />
          </label>
          <label className="mt-4 grid gap-2 text-sm text-slate-300">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white"
            />
          </label>

          {errorMessage && <p role="alert" className="mt-4 text-sm text-rose-200">{errorMessage}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-teal-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <>
      <NavBar email={session.user.email ?? ''} />
      {children}
    </>
  )
}
