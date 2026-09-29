'use client'

import { useCallback, useEffect, useState } from 'react'
import TrackRecordChart from '@/components/TrackRecordChart'
import DeleteSnapshotButton from '@/components/DeleteSnapshotButton'
import { supabase } from '@/lib/supabase'

type Snapshot = { id: string; snapshot_date: string; total_value: number; breakdown: Record<string, number> | null }
type SnapshotAsset = { snapshot_id: string; asset_name: string; category: string; value: number; target_weight: number | null }

function eur(value: number) {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

export default function HistoricoPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [snapshotAssets, setSnapshotAssets] = useState<SnapshotAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const [snapshotsResult, detailsResult] = await Promise.all([
        supabase.from('portfolio_snapshots').select('*').order('snapshot_date', { ascending: false }),
        supabase.from('portfolio_snapshot_assets').select('snapshot_id,asset_name,category,value,target_weight'),
      ])
      const error = snapshotsResult.error ?? detailsResult.error
      if (error) throw error
      setSnapshots((snapshotsResult.data ?? []) as Snapshot[])
      setSnapshotAssets((detailsResult.data ?? []) as SnapshotAsset[])
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo conectar para cargar el histórico.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const refresh = () => window.setTimeout(() => void load(), 0)
    refresh()
    window.addEventListener('portfolio:changed', refresh)
    return () => window.removeEventListener('portfolio:changed', refresh)
  }, [load])

  const chartData = [...snapshots].reverse()

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <header className="mb-7">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Seguimiento temporal</p>
        <h1 className="text-2xl font-semibold text-white">Histórico de cartera</h1>
        <p className="mt-2 text-sm text-slate-400">Los snapshots guardan el valor y el desglose disponibles en la fecha de registro; no se recalculan al editar posiciones.</p>
      </header>

      {errorMessage && <p role="alert" className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">No se pudo cargar el histórico: {errorMessage}</p>}

      <section className="mb-6 rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 sm:p-6">
        <h2 className="font-semibold text-white">Evolución del patrimonio</h2>
        {loading ? <p className="py-12 text-sm text-slate-400">Cargando snapshots…</p> : chartData.length ? <TrackRecordChart data={chartData} /> : <p className="py-12 text-sm text-slate-400">Aún no hay snapshots. Guarda uno desde el Dashboard.</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/70">
        <div className="border-b border-white/[0.08] px-4 py-4 sm:px-6"><h2 className="font-semibold text-white">Registros guardados</h2><p className="mt-1 text-sm text-slate-400">{snapshots.length} {snapshots.length === 1 ? 'snapshot' : 'snapshots'}</p></div>
        {loading ? <p className="p-6 text-sm text-slate-400">Cargando…</p> : snapshots.length === 0 ? <p className="p-6 text-sm text-slate-400">No hay registros que mostrar.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-white/[0.025] text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Fecha</th><th className="px-4 py-3 text-right">Valor total</th><th className="px-4 py-3">Desglose guardado</th><th className="px-5 py-3 text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-white/[0.06]">{snapshots.map((snapshot) => <tr key={snapshot.id}>
              <td className="px-5 py-4 text-slate-200">{new Date(`${snapshot.snapshot_date}T00:00:00`).toLocaleDateString('es-ES')}</td>
              <td className="px-4 py-4 text-right tabular-nums font-medium text-white">{eur(snapshot.total_value)}</td>
              <td className="px-4 py-4 text-xs leading-5 text-slate-400">
                {snapshotAssets.filter((detail) => detail.snapshot_id === snapshot.id).length > 0
                  ? snapshotAssets.filter((detail) => detail.snapshot_id === snapshot.id).map((detail) => `${detail.asset_name}: ${eur(Number(detail.value))}`).join(' · ')
                  : snapshot.breakdown ? Object.entries(snapshot.breakdown).map(([category, value]) => `${category}: ${eur(Number(value))}`).join(' · ') : 'Sin desglose'}
              </td>
              <td className="px-5 py-4 text-right"><DeleteSnapshotButton snapshotId={snapshot.id} date={new Date(`${snapshot.snapshot_date}T00:00:00`).toLocaleDateString('es-ES')} value={snapshot.total_value} /></td>
            </tr>)}</tbody>
          </table></div>
        )}
      </section>
      <div className="sr-only" aria-live="polite">{snapshots.length} snapshots cargados</div>
    </main>
  )
}