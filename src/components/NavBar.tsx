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
  const activeLink = links.find((link) => link.href === pathname) ?? links[0]

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
        <details className="nav-menu order-3 sm:order-none">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl border border-teal-300/20 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-200 transition hover:border-teal-300/40 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200">
            <span className="grid size-5 content-center gap-1" aria-hidden="true"><span className="h-px bg-current" /><span className="h-px bg-current" /><span className="h-px bg-current" /></span>
            <span>{activeLink.label}</span>
            <span className="text-xs text-slate-500" aria-hidden="true">⌄</span>
          </summary>
          <div className="nav-menu-panel" aria-label="Secciones">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Explorar Aureum</p>
            {links.map((link) => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`block rounded-lg px-3 py-2.5 transition ${active ? 'bg-teal-300/10 text-teal-100' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        </details>
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