'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { notifyPortfolioChanged } from '@/lib/portfolioEvents'
import { isCurrencyCodeSupported } from '@/lib/valuation'
import type { LedgerPosition } from '@/lib/ledger'

const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100'

export default function StartLedgerButton({ position }: { position: LedgerPosition }) {
  const [open, setOpen] = useState(false)
  const [fxRate, setFxRate] = useState(position.currency === 'EUR' ? '1' : '')
  const [fxAsOf, setFxAsOf] = useState('')
  const [fxSource, setFxSource] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (position.ledger_started_at) return <span className="text-xs text-emerald-200">Seguimiento activo</span>

  const currency = position.currency?.toUpperCase() ?? ''
  const validBalance = position.quantity > 0 && position.avg_price !== null && position.avg_price > 0
  const rate = Number(fxRate)
  const estimatedBasis = validBalance && Number.isFinite(rate) && rate > 0
    ? position.quantity * position.avg_price! * rate
    : null

  async function startLedger() {
    setError('')
    if (!validBalance) {
      setError('Hace falta cantidad y precio medio positivos para registrar el saldo inicial.')
      return
    }
    if (!isCurrencyCodeSupported(currency)) {
      setError('Confirma primero la moneda de la posición en Editar.')
      return
    }
    if (!confirmed) {
      setError('Confirma que entiendes el alcance de este saldo inicial.')
      return
    }
    if (currency !== 'EUR' && (!Number.isFinite(rate) || rate <= 0 || !fxAsOf || !fxSource.trim())) {
      setError('Para estimar el coste inicial en EUR, indica cambio, fecha y fuente.')
      return
    }

    setLoading(true)
    try {
      const { error: rpcError } = await supabase.rpc('record_portfolio_operation', {
        p_operation: {
          operation_type: 'opening_position',
          position_id: position.id,
          operation_date: new Date().toISOString().slice(0, 10),
          currency,
          fx_rate_to_eur: currency === 'EUR' ? 1 : rate,
          fx_as_of: currency === 'EUR' ? null : fxAsOf,
          fx_source: currency === 'EUR' ? null : fxSource.trim(),
          notes: 'Inicio del ledger con posición existente; no reconstruye operaciones anteriores.',
        },
      })
      if (rpcError) throw rpcError
      setOpen(false)
      notifyPortfolioChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar el seguimiento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setError(''); setOpen(true) }} className="rounded-lg border border-teal-300/20 px-3 py-2 text-xs font-medium text-teal-100 hover:bg-teal-300/10">
        Iniciar seguimiento
      </button>
      {open && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
        <section role="dialog" aria-modal="true" aria-labelledby={`ledger-title-${position.id}`} className="my-auto grid w-full max-w-lg gap-4 rounded-2xl border border-teal-300/20 bg-slate-900 p-5 text-white shadow-2xl">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">Punto de partida</p>
            <h2 id={`ledger-title-${position.id}`} className="mt-1 text-xl">Iniciar seguimiento · {position.name}</h2>
          </div>
          <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.07] p-3 text-sm leading-6 text-amber-100">
            Esto fija un saldo inicial hoy con {position.quantity.toLocaleString('es-ES')} unidades y coste medio {position.avg_price?.toLocaleString('es-ES')} {currency}. No crea compras antiguas ni reconstruye rentabilidad anterior.
          </div>
          {currency !== 'EUR' && <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-300 sm:col-span-2">Coste medio convertido: EUR por 1 {currency}
              <input autoFocus type="number" min="0" step="any" value={fxRate} onChange={(event) => setFxRate(event.target.value)} placeholder="Ejemplo: 0,92" className={inputClass} />
              <span className="text-xs text-slate-400">Usa el cambio que quieras adoptar como coste inicial desde hoy; no se infiere automáticamente.</span>
            </label>
            <label className="grid gap-1 text-sm text-slate-300">Fecha del cambio<input type="date" value={fxAsOf} onChange={(event) => setFxAsOf(event.target.value)} className={inputClass} /></label>
            <label className="grid gap-1 text-sm text-slate-300">Fuente del cambio<input value={fxSource} onChange={(event) => setFxSource(event.target.value)} placeholder="p. ej. BCE o broker" className={inputClass} /></label>
          </div>}
          {estimatedBasis !== null && <p className="text-sm text-slate-300">Coste base estimado al iniciar: <strong className="text-white">{estimatedBasis.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</strong></p>}
          <label className="flex items-start gap-2 text-sm leading-5 text-slate-300">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 size-4 accent-amber-300" />
            Confirmo que este es el punto de partida del seguimiento; las compras/ventas anteriores no se reconstruirán.
          </label>
          {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
          <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <button type="button" onClick={() => setOpen(false)} disabled={loading} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Cancelar</button>
            <button type="button" onClick={() => void startLedger()} disabled={loading || !confirmed} className="rounded-lg bg-teal-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{loading ? 'Iniciando…' : 'Confirmar saldo inicial'}</button>
          </div>
        </section>
      </div>}
    </>
  )
}
