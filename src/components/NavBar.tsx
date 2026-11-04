'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import BrandMark from '@/components/BrandMark'

const links = [
  { href: '/', label: 'Resumen', icon: 'M3 3h8v8H3z M13 3h8v5h-8z M13 10h8v11h-8z M3 13h8v8H3z' },
  { href: '/activos', label: 'Activos y objetivos', icon: 'M12 3 3 8l9 5 9-5-9-5Z M3 12l9 5 9-5 M3 16l9 5 9-5' },
  { href: '/posiciones', label: 'Posiciones', icon: 'M4 5h16M4 12h16M4 19h16 M8 3v4m8 3v4m-8 3v4' },
  { href: '/patrimonio', label: 'Patrimonio', icon: 'M3 10.5 12 4l9 6.5 M5 10v10h14V10 M9 20v-6h6v6' },
  { href: '/operaciones', label: 'Operaciones', icon: 'M4 8h15m0 0-4-4m4 4-4 4 M20 16H5m0 0 4-4m-4 4 4 4' },
  { href: '/historico', label: 'Histórico', icon: 'M12 8v4l3 2 M21 12a9 9 0 1 1-2.64-6.36 M21 3v6h-6' },
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
              <svg className="sidebar-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={link.icon} />
              </svg>
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 17l5-5-5-5M15 12H3M12 3h7v18h-7" />
          </svg>
          {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
        {signOutError && <p className="sidebar-error" role="alert">{signOutError}</p>}
        <p className="sidebar-edition">AUREUM · MMXXVI</p>
      </div>
    </aside>
  )
}
