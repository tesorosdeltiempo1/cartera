'use client'

import { useState, type FormEvent } from 'react'
import { notifyPortfolioChanged } from '@/lib/portfolioEvents'
import { supabase } from '@/lib/supabase'

const REVERSIBLE_TYPES = new Set([
  'deposit', 'withdrawal', 'dividend', 'interest', 'fee',
  'transfer_in', 'transfer_out', 'rental_income', 'property_expense', 'mortgage_payment',
])

export function canReverseTransaction(operationType: string, reversalOfId: string | null | undefined, alreadyReversed: boolean) {
  return REVERSIBLE_TYPES.has(operationType) && !reversalOfId && !alreadyReversed
}

export default function ReverseTransactionButton({
  transactionId,
  operationType,
  reversalOfId,
  alreadyReversed,
  onReversed,
}: {
  transactionId: string
  operationType: string
  reversalOfId: string | null | undefined
  alreadyReversed: boolean
  onReversed: () => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const eligible = canReverseTransaction(operationType, reversalOfId, alreadyReversed)

  if (!eligible) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')
    try {
      const { error } = await supabase.rpc('reverse_portfolio_transaction', {
        p_transaction_id: transactionId,
        p_reason: reason.trim(),
      })
      if (error) throw error
      setOpen(false)
      setReason('')
      notifyPortfolioChanged()
      onReversed()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo revertir el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  return <>
    <button type="button" onClick={() => { setErrorMessage(''); setOpen(true) }} className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 hover:border-amber-300/30 hover:text-amber-100">Revertir</button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-labelledby={`reverse-title-${transactionId}`} className="my-auto grid w-full max-w-md gap-4 rounded-2xl border border-amber-300/20 bg-slate-900 p-5 text-white shadow-2xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Corrección auditable</p>
          <h2 id={`reverse-title-${transactionId}`} className="mt-1 text-lg">Revertir movimiento</h2>
          <p className="mt-2 text-sm leading-5 text-slate-400">No se borra el original. Se añade el apunte contrario con fecha de hoy y motivo. Los traspasos revierten ambas cuentas juntas.</p>
        </div>
        <label className="grid gap-1.5 text-sm text-slate-300">Motivo
          <input value={reason} onChange={(event) => setReason(event.target.value)} required maxLength={300} placeholder="p. ej. importe introducido por error" className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100" />
        </label>
        {errorMessage && <p role="alert" className="text-sm text-rose-200">{errorMessage}</p>}
        <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <button type="button" onClick={() => setOpen(false)} disabled={saving} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Cancelar</button>
          <button type="submit" disabled={saving || !reason.trim()} className="rounded-lg bg-amber-200 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{saving ? 'Guardando…' : 'Confirmar reversión'}</button>
        </div>
      </form>
    </div>}
  </>
}
