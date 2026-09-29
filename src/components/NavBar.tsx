'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/activos', label: 'Activos y objetivos' },
  { href: '/posiciones', label: 'Posiciones' },
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
    <nav aria-label="Navegación principal" className="border-b border-white/[0.08] bg-slate-950/90 px-4 py-3 text-sm backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {links.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 transition ${active ? 'bg-teal-300/10 text-teal-100' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="hidden sm:inline">{email}</span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 transition hover:bg-white/[0.05] disabled:opacity-50"
          >
            {signingOut ? 'Saliendo…' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </nav>
  )
}