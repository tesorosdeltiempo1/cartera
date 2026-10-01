'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import BrandMark from '@/components/BrandMark'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/activos', label: 'Activos y objetivos' },
  { href: '/posiciones', label: 'Posiciones' },
  { href: '/patrimonio', label: 'Patrimonio' },
  { href: '/operaciones', label: 'Operaciones' },
  { href: '/historico', label: 'Histórico' },
]

export default function NavBar({ email }: { email: string }) {
  const pathname = usePathname()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    setSigningOut(false)
  }

  return (
    <nav aria-label="Navegación principal" className="border-b border-teal-300/20 bg-slate-950/95 px-4 py-3 text-sm backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Link href="/" aria-label="Aureum, ir al dashboard" className="flex shrink-0 items-center gap-3">
          <BrandMark className="brand-mark size-10" />
          <span className="grid gap-0.5">
            <span className="brand-wordmark text-sm font-semibold text-white">AUREUM</span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-slate-500">Patrimonio · Legado</span>
          </span>
        </Link>
        <div className="order-3 flex w-full gap-1 overflow-x-auto pb-0.5 sm:order-none sm:w-auto sm:flex-1 sm:justify-center">
          {links.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 rounded-lg border px-3 py-2 transition ${active ? 'border-teal-300/30 bg-teal-300/10 text-teal-100' : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white'}`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-400 sm:ml-0">
          <span className="hidden max-w-40 truncate lg:inline" title={email}>{email}</span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-lg border border-teal-300/20 px-3 py-2 text-slate-300 transition hover:border-teal-300/40 hover:bg-white/[0.04] disabled:opacity-50"
          >
            {signingOut ? 'Saliendo…' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </nav>
  )
}