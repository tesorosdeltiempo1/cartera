'use client'

import { useId, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { notifyPortfolioChanged } from '@/lib/portfolioEvents'

export default function DeleteAssetButton({ assetId, assetName }: { assetId: string; assetName: string }) {
  const dialogId = useId()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleDelete() {
    setLoading(true)
    setErrorMessage('')

    try {
      const { data, error } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetId)
        .select('id')
        .single()

      if (error || !data) {
        setErrorMessage(`No se pudo eliminar la posición: ${error?.message ?? 'no se encontró la posición'}`)
        return
      }

      setConfirming(false)
      notifyPortfolioChanged()
    } catch {
      setErrorMessage('No se pudo eliminar la posición. Comprueba la conexión e inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrorMessage('')
          setConfirming(true)
        }}
        aria-label={`Eliminar ${assetName}`}
        className="rounded-lg border border-rose-300/15 bg-rose-300/[0.04] px-3 py-1.5 text-xs font-medium text-rose-200 transition hover:border-rose-300/30 hover:bg-rose-300/10"
      >
        Eliminar
      </button>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${dialogId}-title`}
            aria-describedby={`${dialogId}-description`}
            className="my-auto w-full max-w-md rounded-2xl border border-rose-300/15 bg-slate-900 p-5 text-white shadow-2xl"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-200">Acción irreversible</p>
            <h2 id={`${dialogId}-title`} className="text-lg font-semibold">¿Eliminar esta posición?</h2>
            <p id={`${dialogId}-description`} className="mt-2 text-sm leading-6 text-slate-300">
              Se eliminará <strong className="text-white">{assetName}</strong> de la cartera. Esta acción no se puede deshacer.
            </p>

            {errorMessage && <p role="alert" className="mt-4 text-sm text-rose-200">{errorMessage}</p>}

            <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={loading}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-xl bg-rose-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Eliminando…' : 'Sí, eliminar posición'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
