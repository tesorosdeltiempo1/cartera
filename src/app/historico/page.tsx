'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import TrackRecordChart from '@/components/TrackRecordChart'
import DeleteSnapshotButton from '@/components/DeleteSnapshotButton'
import HistoricalSnapshotForm from '@/components/HistoricalSnapshotForm'
import { supabase } from '@/lib/supabase'
import { formatCurrency, type SnapshotValuationDetail } from '@/lib/valuation'
import { compareSnapshotValues } from '@/lib/historicalSnapshot'

type Snapshot = { id: string; snapshot_date: string; total_value: number; breakdown: Record<string, number> | null; cash_breakdown: { broker: string; currency: string; balance: number; fx_rate_to_eur: number; fx_as_of: string | null; fx_source: string | null; value_eur: number }[] | null; source_note: string | null }
type SnapshotAsset = { snapshot_id: string; asset_name: string; category: string; value: number; target_weight: number | null; valuation_detail: SnapshotValuationDetail[] | null; confirmed_value: number | null; estimated_value: number | null }

function eur(value: number) {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function HistoricoPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [snapshotAssets, setSnapshotAssets] = useState<SnapshotAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const currentRequestId = ++requestId.current
    setLoading(true)
    setErrorMessage('')
    try {
      const [snapshotsResult, detailsResult] = await Promise.all([
        supabase.from('portfolio_snapshots').select('*').order('snapshot_date', { ascending: false }),
        supabase.from('portfolio_snapshot_assets').select('snapshot_id,asset_name,category,value,target_weight,valuation_detail,confirmed_value,estimated_value'),
      ])
      const error = snapshotsResult.error ?? detailsResult.error
      if (error) throw error
      if (currentRequestId !== requestId.current) return
      setSnapshots((snapshotsResult.data ?? []) as Snapshot[])
      setSnapshotAssets((detailsResult.data ?? []) as SnapshotAsset[])
    } catch (error) {
      if (currentRequestId === requestId.current) {
        setErrorMessage(error instanceof Error ? error.message : 'No se pudo conectar para cargar el histórico.')
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let timeout: number | undefined
    const refresh = () => {
      if (timeout !== undefined) window.clearTimeout(timeout)
      timeout = window.setTimeout(() => void load(), 0)
    }
    refresh()
    window.addEventListener('portfolio:changed', refresh)
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout)
      requestId.current += 1
      window.removeEventListener('portfolio:changed', refresh)
    }
  }, [load])

  const chartData = [...snapshots].reverse()
  const previousSnapshotById = new Map<string, Snapshot>()
  chartData.forEach((snapshot, index) => {
    const previous = chartData[index - 1]
    if (previous) previousSnapshotById.set(snapshot.id, previous)
  })
  const latestSnapshot = chartData.at(-1)
  const previousLatestSnapshot = chartData.at(-2)
  const latestChange = latestSnapshot && previousLatestSnapshot
    ? compareSnapshotValues(Number(latestSnapshot.total_value), Number(previousLatestSnapshot.total_value))
    : null

  return (
    <main className="app-page">
      <header className="mb-7">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Seguimiento temporal</p>
        <h1 className="text-2xl font-semibold text-white">Histórico de cartera</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Cada corte es una fotografía con su propio alcance y fuente. La diferencia entre dos totales no es rentabilidad: puede incluir aportaciones, retiradas o cambios en los datos incluidos.</p>
      </header>

      {errorMessage && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
        <p>No se pudo cargar el histórico: {errorMessage}</p>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border border-rose-200/20 px-3 py-2 font-medium hover:bg-rose-200/10 disabled:cursor-wait disabled:opacity-50">Reintentar</button>
      </div>}

      <section aria-label="Resumen del histórico" className="mb-5 grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-white/[0.08] bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">Cortes guardados</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-white">{snapshots.length}</p>
          <p className="mt-1 text-xs text-slate-500">{snapshots.length > 1 ? `${dateLabel(chartData[0].snapshot_date)} — ${dateLabel(chartData.at(-1)!.snapshot_date)}` : snapshots.length === 1 ? `Desde ${dateLabel(chartData[0].snapshot_date)}` : 'Sin periodo registrado'}</p>
        </article>
        <article className="rounded-xl border border-white/[0.08] bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">Último corte</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-white">{latestSnapshot ? eur(Number(latestSnapshot.total_value)) : '—'}</p>
          <p className="mt-1 text-xs text-slate-500">{latestSnapshot ? dateLabel(latestSnapshot.snapshot_date) : 'Aún no hay cortes'}</p>
        </article>
        <article className="rounded-xl border border-white/[0.08] bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">Variación nominal entre los dos últimos</p>
          {latestChange && previousLatestSnapshot ? (
            <>
              <p className={`mt-2 text-2xl font-medium tabular-nums ${latestChange.difference >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                {latestChange.difference > 0 ? '+' : ''}{eur(latestChange.difference)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {latestChange.percentage > 0 ? '+' : ''}{latestChange.percentage.toLocaleString('es-ES', { maximumFractionDigits: 2 })}% frente al {dateLabel(previousLatestSnapshot.snapshot_date)} · no es rentabilidad
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-2xl font-medium text-slate-500">—</p>
              <p className="mt-1 text-xs text-slate-500">Se necesitan dos cortes comparables.</p>
            </>
          )}
        </article>
      </section>

      <section className="mb-6 rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 sm:p-6">
        <h2 className="font-semibold text-white">Evolución de los importes registrados</h2>
        {loading ? <p className="py-12 text-sm text-slate-400">Cargando cortes…</p> : chartData.length ? <TrackRecordChart data={chartData} /> : <p className="py-12 text-sm text-slate-400">Aún no hay cortes. Puedes guardar uno desde el Resumen.</p>}
      </section>

      <details className="mb-6 overflow-hidden rounded-xl border border-white/[0.08] bg-slate-900/50">
        <summary className="cursor-pointer px-4 py-4 text-sm font-medium text-slate-200 sm:px-6">Añadir un corte histórico agregado</summary>
        <div className="border-t border-white/[0.08] pt-5">
          <HistoricalSnapshotForm />
        </div>
      </details>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/70">
        <div className="border-b border-white/[0.08] px-4 py-4 sm:px-6"><h2 className="font-semibold text-white">Registro de cortes</h2><p className="mt-1 text-sm text-slate-400">Más reciente primero · abre cada fecha para consultar desglose y fuentes.</p></div>
        {loading ? <p className="p-6 text-sm text-slate-400">Cargando…</p> : snapshots.length === 0 ? <p className="p-6 text-sm text-slate-400">No hay cortes que mostrar.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-white/[0.025] text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Fecha del corte</th><th className="px-4 py-3 text-right">Total registrado</th><th className="px-4 py-3 text-right">Variación nominal</th><th className="px-5 py-3 text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-white/[0.06]">{snapshots.map((snapshot) => {
              const details = snapshotAssets.filter((detail) => detail.snapshot_id === snapshot.id)
              const valuationInputs = details.flatMap((detail) => detail.valuation_detail ?? [])
              const cashRows = snapshot.cash_breakdown ?? []
              const hasQualitySplit = details.length > 0 && details.every((detail) => detail.confirmed_value !== null && detail.estimated_value !== null)
              const confirmedValue = details.reduce((sum, detail) => sum + (Number(detail.confirmed_value) || 0), 0)
                + cashRows.reduce((sum, row) => sum + Number(row.value_eur), 0)
              const estimatedValue = details.reduce((sum, detail) => sum + (Number(detail.estimated_value) || 0), 0)
              const previous = previousSnapshotById.get(snapshot.id)
              const change = previous
                ? compareSnapshotValues(Number(snapshot.total_value), Number(previous.total_value))
                : null
              return <Fragment key={snapshot.id}>
                <tr>
                  <td className="px-5 py-4 text-slate-200">{dateLabel(snapshot.snapshot_date)}</td>
                  <td className="px-4 py-4 text-right tabular-nums font-medium text-white">{eur(Number(snapshot.total_value))}</td>
                  <td className={`px-4 py-4 text-right tabular-nums text-xs ${change ? change.difference >= 0 ? 'text-emerald-200' : 'text-rose-200' : 'text-slate-500'}`}>
                    {change && previous
                      ? <><span className="block">{change.difference > 0 ? '+' : ''}{eur(change.difference)}</span><span className="mt-0.5 block text-slate-500">{change.percentage > 0 ? '+' : ''}{change.percentage.toLocaleString('es-ES', { maximumFractionDigits: 2 })}% vs {dateLabel(previous.snapshot_date)}</span></>
                      : 'Primer corte'}
                  </td>
                  <td className="px-5 py-4 text-right"><DeleteSnapshotButton snapshotId={snapshot.id} date={dateLabel(snapshot.snapshot_date)} value={Number(snapshot.total_value)} /></td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-5 pb-4 pt-0">
                    <details className="text-xs leading-5 text-slate-400">
                      <summary className="cursor-pointer text-teal-200">Desglose, fuentes y valoración</summary>
                      <div className="mt-3 grid gap-3 border-l border-teal-300/25 pl-4">
                        {details.length > 0 || cashRows.length > 0
                          ? <>
                            {details.length > 0 && <ul className="grid gap-1">{details.map((detail) => <li key={`${snapshot.id}:${detail.asset_name}`} className="flex flex-wrap justify-between gap-x-4"><span>{detail.asset_name}</span><strong className="font-medium text-slate-200">{eur(Number(detail.value))}</strong></li>)}</ul>}
                            {cashRows.length > 0 && <div><p className="mb-1 text-slate-300">Efectivo</p><ul className="grid gap-1">{cashRows.map((row) => <li key={`${snapshot.id}:${row.broker}:${row.currency}`} className="flex flex-wrap justify-between gap-x-4"><span>{row.broker} · {formatCurrency(Number(row.balance), row.currency)}</span><strong className="font-medium text-slate-200">{eur(Number(row.value_eur))}</strong></li>)}</ul></div>}
                            {hasQualitySplit && <p className="border-t border-white/[0.07] pt-2">Con referencias: {eur(confirmedValue)} · estimación manual: {eur(estimatedValue)}. El total del corte incluye ambos importes.</p>}
                          </>
                          : snapshot.breakdown
                            ? <ul className="grid gap-1">{Object.entries(snapshot.breakdown).map(([category, value]) => <li key={category} className="flex flex-wrap justify-between gap-x-4"><span>{category}</span><strong className="font-medium text-slate-200">{eur(Number(value))}</strong></li>)}</ul>
                            : <p>Este corte no conserva desglose.</p>}
                        {snapshot.source_note && <p className="whitespace-pre-wrap border-t border-white/[0.07] pt-2">{snapshot.source_note}</p>}
                        {valuationInputs.length > 0 && <details className="text-slate-300">
                          <summary className="cursor-pointer">Ver precios y conversiones guardados ({valuationInputs.length})</summary>
                          <ul className="mt-2 grid gap-2">
                            {valuationInputs.map((input) => <li key={`${input.position_id}:${input.currency}`} className="border-l border-white/10 pl-3">
                              <span className="font-medium text-slate-200">{input.position_name}{input.broker ? ` · ${input.broker}` : ''}</span>
                              <span className="block">{input.quantity.toLocaleString('es-ES')} × {formatCurrency(input.unit_price, input.currency)} · precio {dateLabel(input.price_as_of)} ({input.price_source})</span>
                              <span className="block">Cambio: {input.fx_rate_to_eur.toLocaleString('es-ES', { maximumSignificantDigits: 8 })} EUR/{input.currency}{input.fx_as_of ? ` · ${dateLabel(input.fx_as_of)}` : ''}{input.fx_source ? ` · ${input.fx_source}` : ''} · valor {eur(input.value_eur)}</span>
                            </li>)}
                          </ul>
                        </details>}
                      </div>
                    </details>
                  </td>
                </tr>
              </Fragment>
            })}</tbody>
          </table></div>
        )}
      </section>
      <div className="sr-only" aria-live="polite">{snapshots.length} {snapshots.length === 1 ? 'corte cargado' : 'cortes cargados'}</div>
    </main>
  )
}