'use client'

import { useMemo, useRef, useState, type FormEvent } from 'react'
import { prepareHistoricalSnapshot, type HistoricalSnapshotLine } from '@/lib/historicalSnapshot'
import { notifyPortfolioChanged } from '@/lib/portfolioEvents'
import { supabase } from '@/lib/supabase'

const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100'
const labelClass = 'grid min-w-0 gap-1.5 text-sm text-slate-300'
const initialLines: HistoricalSnapshotLine[] = [
  { broker: 'Trade Republic', amount: '' },
  { broker: 'XTB', amount: '' },
  { broker: 'eToro', amount: '' },
  { broker: 'Cold wallet', amount: '' },
]

function formatEur(value: number) {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

export default function HistoricalSnapshotForm() {
  const [snapshotDate, setSnapshotDate] = useState('2026-10-22')
  const [lines, setLines] = useState(initialLines)
  const [sourceNote, setSourceNote] = useState('Informe de cartera v3 · 22-oct-2026; resumen agregado por broker, sin detalle por posición. Política vigente: Plan 2026-2030.')
  const [saving, setSaving] = useState(false)
  const saveInProgress = useRef(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const preview = useMemo(() => {
    try {
      return prepareHistoricalSnapshot(snapshotDate, lines, new Date().toISOString().slice(0, 10))
    } catch {
      return null
    }
  }, [lines, snapshotDate])

  function updateLine(index: number, patch: Partial<HistoricalSnapshotLine>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line))
  }

  function addLine() {
    setLines((current) => [...current, { broker: '', amount: '' }])
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saveInProgress.current) return
    saveInProgress.current = true
    setSaving(true)
    setMessage('')
    setErrorMessage('')

    try {
      const prepared = prepareHistoricalSnapshot(snapshotDate, lines, new Date().toISOString().slice(0, 10))
      const trimmedSourceNote = sourceNote.trim()
      if (!trimmedSourceNote || trimmedSourceNote.length > 500) {
        throw new Error('Indica la fuente del snapshot (máximo 500 caracteres).')
      }

      const { data, error } = await supabase.rpc('save_historical_portfolio_snapshot', {
        p_snapshot_date: snapshotDate,
        p_total_value: prepared.totalValue,
        p_breakdown: prepared.breakdown,
        p_source_note: trimmedSourceNote,
      })
      if (error) throw error
      if (!data) throw new Error('No se recibió el identificador del snapshot.')

      setMessage(`Snapshot histórico guardado: ${formatEur(prepared.totalValue)}. No se modificaron las posiciones actuales.`)
      notifyPortfolioChanged()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar el snapshot histórico.')
    } finally {
      saveInProgress.current = false
      setSaving(false)
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-amber-200/15 bg-slate-900/70 p-4 sm:p-6">
      <h2 className="font-semibold text-white">Añadir snapshot histórico agregado</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
        Guarda una fecha pasada y un total por broker. No crea posiciones individuales, no cambia datos actuales y no incluye inmuebles ni hipotecas.
      </p>

      <form className="mt-5 grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className={labelClass}>
          Fecha de valoración
          <input className={inputClass} type="date" value={snapshotDate} onChange={(event) => setSnapshotDate(event.target.value)} required />
        </label>

        <div className="grid gap-3">
          {lines.map((line, index) => (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_auto]" key={index}>
              <label className={labelClass}>
                Broker / cuenta
                <input className={inputClass} value={line.broker} onChange={(event) => updateLine(index, { broker: event.target.value })} maxLength={100} />
              </label>
              <label className={labelClass}>
                Importe (€)
                <input className={inputClass} type="text" inputMode="decimal" placeholder="0,00" value={line.amount} onChange={(event) => updateLine(index, { amount: event.target.value })} />
              </label>
              {lines.length > 1 && <button className="self-end rounded-lg border border-white/10 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5" type="button" onClick={() => removeLine(index)}>Quitar</button>}
            </div>
          ))}
          <button className="justify-self-start rounded-lg border border-white/10 px-3 py-2 text-sm text-teal-200 hover:bg-white/5" type="button" onClick={addLine}>Añadir broker</button>
        </div>

        <label className={labelClass}>
          Fuente y limitaciones
          <input className={inputClass} value={sourceNote} onChange={(event) => setSourceNote(event.target.value)} maxLength={500} required />
        </label>

        <p className="text-xs leading-5 text-amber-100/70">
          Los importes se sumarán automáticamente. Se admiten decimales con coma o punto y separadores españoles de miles.
        </p>
        <p className="text-sm font-medium text-slate-200" aria-live="polite">
          Total del snapshot: {preview ? formatEur(preview.totalValue) : 'completa los importes para calcularlo'}
        </p>
        {errorMessage && <p className="text-sm text-rose-200" role="alert">{errorMessage}</p>}
        {message && <p className="text-sm text-teal-200" role="status">{message}</p>}

        <button className="justify-self-start rounded-xl bg-teal-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar snapshot histórico'}
        </button>
      </form>
    </section>
  )
}
