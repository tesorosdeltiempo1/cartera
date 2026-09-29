'use client'

import { useId, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { notifyPortfolioChanged } from '@/lib/portfolioEvents'

export default function DeleteSnapshotButton({ snapshotId, date, value }: { snapshotId: string; date: string; value: number }) {
  const dialogId = useId()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleDelete() {
    setLoading(true)
    setErrorMessage('')
    try {
      const { data, error } = await supabase.from('portfolio_snapshots').delete().eq('id', snapshotId).select('id').single()
      if (error || !data) {
        setErrorMessage(`No se pudo eliminar el snapshot: ${error?.message ?? 'no se encontró el registro'}`)
        return
      }
      setConfirming(false)
      notifyPortfolioChanged()
    } catch {
      setErrorMessage('No se pudo eliminar. Comprueba la conexión e inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setErrorMessage(''); setConfirming(true) }} className="rounded-lg border border-rose-300/15 px-3 py-2 text-xs font-medium text-rose-200 hover:bg-rose-300/10">Eliminar</button>
      {confirming && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
        <section role="alertdialog" aria-modal="true" aria-labelledby={`${dialogId}-title`} aria-describedby={`${dialogId}-description`} className="w-full max-w-md rounded-2xl border border-rose-300/15 bg-slate-900 p-5 text-white shadow-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-200">Acción irreversible</p>
          <h2 id={`${dialogId}-title`} className="text-lg font-semibold">¿Eliminar este snapshot?</h2>
          <p id={`${dialogId}-description`} className="mt-2 text-sm leading-6 text-slate-300">Se eliminará el registro del {date} por {value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}. No se puede deshacer.</p>
          {errorMessage && <p role="alert" className="mt-4 text-sm text-rose-200">{errorMessage}</p>}
          <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <button type="button" onClick={() => setConfirming(false)} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06] disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={() => void handleDelete()} disabled={loading} className="rounded-xl bg-rose-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-rose-300 disabled:opacity-50">{loading ? 'Eliminando…' : 'Sí, eliminar snapshot'}</button>
          </div>
        </section>
      </div>}
    </>
  )
}
