'use client'

import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import NavBar from '@/components/NavBar'
import BrandMark from '@/components/BrandMark'

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
        <form onSubmit={handleSignIn} className="login-card w-full max-w-md rounded-3xl border border-teal-300/20 bg-slate-900/95 p-7 shadow-2xl shadow-black/30 sm:p-9">
          <div className="relative z-10 flex flex-col items-center text-center">
            <BrandMark className="brand-mark mb-5 size-16" />
            <p className="brand-wordmark text-[11px] font-semibold uppercase text-teal-200">Aureum · Patrimonio privado</p>
            <h1 className="mt-3 text-3xl text-white">Bienvenido</h1>
            <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">Un espacio reservado para custodiar tu patrimonio con criterio y perspectiva.</p>
          </div>

          <label className="relative z-10 mt-7 grid gap-2 text-sm text-slate-300">
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
          <label className="relative z-10 mt-4 grid gap-2 text-sm text-slate-300">
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

          {errorMessage && <p role="alert" className="relative z-10 mt-4 rounded-lg border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-sm text-rose-200">{errorMessage}</p>}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="relative z-10 mt-6 w-full rounded-xl bg-teal-300 px-4 py-3 text-sm font-semibold tracking-wide text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Entrando…' : 'Iniciar sesión'}
          </button>
          <p className="relative z-10 mt-5 text-center text-[11px] uppercase tracking-[0.14em] text-slate-500">Acceso exclusivo del propietario</p>
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
