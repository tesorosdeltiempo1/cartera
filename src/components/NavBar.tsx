'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import BrandMark from '@/components/BrandMark'

const links = [
  { href: '/', label: 'Dashboard', number: '01' },
  { href: '/activos', label: 'Activos y objetivos', number: '02' },
  { href: '/posiciones', label: 'Posiciones', number: '03' },
  { href: '/patrimonio', label: 'Patrimonio', number: '04' },
  { href: '/operaciones', label: 'Operaciones', number: '05' },
  { href: '/historico', label: 'Histórico', number: '06' },
]

export default function NavBar({ email }: { email: string }) {
  const pathname = usePathname()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  async function handleSignOut() {
    setSigningOut(true)
    setSignOutError('')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) setSignOutError('No se pudo cerrar sesión. Inténtalo de nuevo.')
    } catch {
      setSignOutError('No se pudo conectar para cerrar sesión. Inténtalo de nuevo.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <aside className="app-sidebar">
      <Link href="/" aria-label="Aureum, ir al dashboard" className="sidebar-brand">
        <BrandMark className="brand-mark size-10 shrink-0" />
        <span className="grid gap-1">
          <span className="sidebar-wordmark">AUREUM</span>
          <span className="sidebar-caption">Patrimonio · Legado</span>
        </span>
      </Link>

      <div className="sidebar-rule" />
      <p className="sidebar-section-label">Tu espacio</p>
      <nav aria-label="Navegación principal" className="sidebar-links">
        {links.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              aria-label={link.label}
              title={link.label}
              className={`sidebar-link${active ? ' is-active' : ''}`}
            >
              <span className="sidebar-link-number">{link.number}</span>
              <span className="sidebar-link-label">{link.label}</span>
              {active && <span className="sidebar-link-indicator" aria-hidden="true" />}
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-rule" />
        <p className="sidebar-section-label">Sesión privada</p>
        <p className="sidebar-email" title={email}>{email}</p>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          aria-label={signingOut ? 'Cerrando sesión' : 'Cerrar sesión'}
          className="sidebar-signout"
        >
          <span aria-hidden="true">←</span>
          {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
        {signOutError && <p className="sidebar-error" role="alert">{signOutError}</p>}
        <p className="sidebar-edition">AUREUM · MMXXVI</p>
      </div>
    </aside>
  )
}
