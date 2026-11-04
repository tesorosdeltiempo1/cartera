'use client'

import { useState, type FormEvent } from 'react'
import type { CashAccount } from '@/lib/ledger'
import { notifyPortfolioChanged } from '@/lib/portfolioEvents'
import { isCurrencyCodeSupported } from '@/lib/valuation'
import { supabase } from '@/lib/supabase'

const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100'
const labelClass = 'grid min-w-0 gap-1.5 text-sm text-slate-300'

export default function CashTransferForm({ accounts, onSaved }: { accounts: CashAccount[]; onSaved: () => void }) {
  const [fromId, setFromId] = useState(accounts[0]?.id ?? '')
  const [toId, setToId] = useState(accounts.find((account) => account.id !== accounts[0]?.id)?.id ?? '')
  const [amount, setAmount] = useState('')
  const [operationDate, setOperationDate] = useState(new Date().toISOString().slice(0, 10))
  const [fxRate, setFxRate] = useState('')
  const [fxAsOf, setFxAsOf] = useState(new Date().toISOString().slice(0, 10))
  const [fxSource, setFxSource] = useState('Banco Central Europeo (BCE)')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const effectiveFromId = accounts.some((account) => account.id === fromId) ? fromId : accounts[0]?.id ?? ''
  const source = accounts.find((account) => account.id === effectiveFromId)
  const destinations = accounts.filter((account) => account.id !== effectiveFromId && account.currency === source?.currency)
  const effectiveToId = destinations.some((account) => account.id === toId) ? toId : destinations[0]?.id ?? ''
  const destination = destinations.find((account) => account.id === effectiveToId)

  function handleSourceChange(id: string) {
    setFromId(id)
    const account = accounts.find((item) => item.id === id)
    setToId(accounts.find((item) => item.id !== id && item.currency === account?.currency)?.id ?? '')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    const parsedAmount = Number(amount)
    const rate = Number(fxRate)

    if (!source || !destination || source.id === destination.id) {
      setErrorMessage('Selecciona dos cuentas distintas en la misma moneda.')
      setSaving(false)
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('El importe del traspaso debe ser mayor que cero.')
      setSaving(false)
      return
    }
    if (!isCurrencyCodeSupported(source.currency)) {
      setErrorMessage('La moneda de la cuenta no es válida.')
      setSaving(false)
      return
    }
    if (source.currency !== 'EUR' && (!Number.isFinite(rate) || rate <= 0 || !fxAsOf || !fxSource.trim())) {
      setErrorMessage('Para moneda extranjera indica el cambio vigente a EUR, fecha y fuente.')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase.rpc('record_cash_transfer', {
        p_from_account_id: source.id,
        p_to_account_id: destination.id,
        p_amount: parsedAmount,
        p_operation_date: operationDate,
        p_fx_rate_to_eur: source.currency === 'EUR' ? 1 : rate,
        p_fx_as_of: source.currency === 'EUR' ? null : fxAsOf,
        p_fx_source: source.currency === 'EUR' ? null : fxSource,
        p_notes: notes.trim() || null,
      })
      if (error) throw error
      setSuccessMessage('Traspaso registrado en ambas cuentas; el total de efectivo no cambia.')
      setAmount('')
      setNotes('')
      notifyPortfolioChanged()
      onSaved()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo registrar el traspaso.')
    } finally {
      setSaving(false)
    }
  }

  if (accounts.length < 2) {
    return <p className="text-sm text-slate-400">Registra dos cuentas de la misma moneda para poder traspasar efectivo entre ellas.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 border-t border-white/10 pt-4">
      <div>
        <h3 className="font-medium text-white">Traspasar entre cuentas</h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">Guarda salida y entrada juntas. Solo se permiten cuentas en la misma moneda para que el total no se duplique ni dependa de una conversión implícita.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={labelClass}>Desde
          <select value={effectiveFromId} onChange={(event) => handleSourceChange(event.target.value)} required className={inputClass}>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.broker} · {account.currency}</option>)}
          </select>
        </label>
        <label className={labelClass}>Hacia
          <select value={effectiveToId} onChange={(event) => setToId(event.target.value)} required className={inputClass}>
            {destinations.map((account) => <option key={account.id} value={account.id}>{account.broker} · {account.currency}</option>)}
          </select>
        </label>
        <label className={labelClass}>Importe ({source?.currency ?? ''})
          <input type="number" min="0.01" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} required className={inputClass} />
        </label>
        <label className={labelClass}>Fecha
          <input type="date" value={operationDate} onChange={(event) => setOperationDate(event.target.value)} required className={inputClass} />
        </label>
        {source?.currency !== 'EUR' && <>
          <label className={labelClass}>EUR por 1 {source?.currency}
            <input type="number" min="0.00000001" step="any" value={fxRate} onChange={(event) => setFxRate(event.target.value)} required className={inputClass} />
          </label>
          <label className={labelClass}>Fecha del cambio
            <input type="date" value={fxAsOf} onChange={(event) => setFxAsOf(event.target.value)} required className={inputClass} />
          </label>
          <label className={labelClass}>Fuente del cambio
            <select value={fxSource} onChange={(event) => setFxSource(event.target.value)} className={inputClass}>
              <option>Banco Central Europeo (BCE)</option>
              <option>Mi banco</option>
              <option>Anotación manual</option>
            </select>
          </label>
        </>}
        <label className="grid gap-1.5 text-sm text-slate-300 sm:col-span-2 lg:col-span-3">Nota opcional
          <input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} placeholder="Referencia del traspaso" className={inputClass} />
        </label>
      </div>
      {errorMessage && <p role="alert" className="text-sm text-rose-200">{errorMessage}</p>}
      {successMessage && <p role="status" className="text-sm text-emerald-200">{successMessage}</p>}
      <button type="submit" disabled={saving || !destination} className="w-full rounded-lg bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50 sm:w-fit">{saving ? 'Guardando…' : 'Registrar traspaso'}</button>
    </form>
  )
}
