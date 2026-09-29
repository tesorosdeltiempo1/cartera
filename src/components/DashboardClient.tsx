'use client'

import { useCallback, useEffect, useState } from 'react'
import AllocationComparison from '@/components/AllocationComparison'
import ExportBackupButton from '@/components/ExportBackupButton'
import PortfolioChart from '@/components/PortfolioChart'
import SaveSnapshotButton from '@/components/SaveSnapshotButton'
import TrackRecordChart from '@/components/TrackRecordChart'
import { supabase } from '@/lib/supabase'

type Category = 'Núcleo Pasivo' | 'Satélite Convicción' | 'Seguridad y Liquidez' | 'Activos Duros' | 'Especulativo'
type Position = {
  id: string
  name: string
  ticker: string | null
  category: Category
  broker: string | null
  quantity: number
  avg_price: number | null
  current_price: number | null
  target_weight: number | null
  investment_asset_id: string | null
}
type InvestmentAsset = { id: string; name: string; category: Category; target_weight: number | null }
type Snapshot = { id: string; snapshot_date: string; total_value: number; breakdown: Record<string, number> }
type SnapshotAsset = { snapshot_id: string; investment_asset_id: string | null; asset_name: string; category: Category; value: number; target_weight: number | null }

const CATEGORIES: Category[] = ['Núcleo Pasivo', 'Satélite Convicción', 'Seguridad y Liquidez', 'Activos Duros', 'Especulativo']
const CATEGORY_STYLES: Record<Category, string> = {
  'Núcleo Pasivo': 'border-cyan-300/20 bg-cyan-300/10 text-cyan-200',
  'Satélite Convicción': 'border-amber-300/20 bg-amber-300/10 text-amber-200',
  'Seguridad y Liquidez': 'border-violet-300/20 bg-violet-300/10 text-violet-200',
  'Activos Duros': 'border-orange-300/20 bg-orange-300/10 text-orange-200',
  Especulativo: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200',
}

function valueOf(position: Position) {
  return position.quantity * (position.current_price ?? position.avg_price ?? 0)
}

function eur(value: number) {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

export default function DashboardClient() {
  const [positions, setPositions] = useState<Position[]>([])
  const [investmentAssets, setInvestmentAssets] = useState<InvestmentAsset[]>([])
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [snapshotAssets, setSnapshotAssets] = useState<SnapshotAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadDashboard = useCallback(async () => {
    try {
      const [positionsResult, investmentsResult, snapshotsResult, snapshotAssetsResult] = await Promise.all([
        supabase.from('assets').select('*').order('category').order('name'),
        supabase.from('investment_assets').select('*').order('name'),
        supabase.from('portfolio_snapshots').select('*').order('snapshot_date'),
        supabase.from('portfolio_snapshot_assets').select('*'),
      ])
      const failed = positionsResult.error ?? investmentsResult.error ?? snapshotsResult.error ?? snapshotAssetsResult.error
      if (failed) throw failed
      setPositions((positionsResult.data ?? []) as Position[])
      setInvestmentAssets((investmentsResult.data ?? []) as InvestmentAsset[])
      setSnapshots((snapshotsResult.data ?? []) as Snapshot[])
      setSnapshotAssets((snapshotAssetsResult.data ?? []) as SnapshotAsset[])
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar los datos. Comprueba la sesión y la configuración de Supabase.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const refresh = () => window.setTimeout(() => void loadDashboard(), 0)
    refresh()
    window.addEventListener('portfolio:changed', refresh)
    return () => window.removeEventListener('portfolio:changed', refresh)
  }, [loadDashboard])

  const totals = CATEGORIES.map((category) => ({
    category,
    value: positions.filter((position) => position.category === category).reduce((sum, position) => sum + valueOf(position), 0),
  }))
  const grandTotal = totals.reduce((sum, total) => sum + total.value, 0)
  const allocationData = CATEGORIES.map((category) => {
    const categoryAssets = investmentAssets.filter((asset) => asset.category === category)
    const categoryPositions = positions.filter((position) =>
      categoryAssets.some((asset) => asset.id === position.investment_asset_id),
    )
    return {
      category,
      actualWeight: grandTotal > 0 ? categoryPositions.reduce((sum, position) => sum + valueOf(position), 0) / grandTotal * 100 : 0,
      targetWeight: categoryAssets.reduce((sum, asset) => sum + (asset.target_weight ?? 0), 0),
      hasPositions: categoryAssets.length > 0,
      targetComplete: categoryAssets.length > 0 && categoryAssets.every((asset) => asset.target_weight !== null),
    }
  })
  const unlinkedCount = positions.filter((position) => !position.investment_asset_id).length
  const masterTargetsCount = investmentAssets.filter((asset) => asset.target_weight !== null).length
  const snapshotDetailRows: Omit<SnapshotAsset, 'snapshot_id'>[] = [
    ...investmentAssets.map((asset) => ({
      investment_asset_id: asset.id,
      asset_name: asset.name,
      category: asset.category,
      value: positions.filter((position) => position.investment_asset_id === asset.id).reduce((sum, position) => sum + valueOf(position), 0),
      target_weight: asset.target_weight,
    })),
    ...positions.filter((position) => !position.investment_asset_id).map((position) => ({
      investment_asset_id: null,
      asset_name: `Sin vincular: ${position.name}${position.broker ? ` · ${position.broker}` : ''}`,
      category: position.category,
      value: valueOf(position),
      target_weight: null,
    })),
  ]

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 text-slate-100 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-200">Patrimonio personal</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Dashboard</h1>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300">
          <span className="mr-2 inline-block size-1.5 rounded-full bg-teal-300" />Seguimiento manual
        </div>
      </header>

      {errorMessage && <div role="alert" className="mb-6 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">No se pudieron cargar los datos: {errorMessage}</div>}
      {unlinkedCount > 0 && (
        <div className="mb-6 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] px-4 py-3 text-sm leading-6 text-amber-100">
          Hay {unlinkedCount} posiciones sin vincular a un activo consolidado. La comparación por activo solo incluye posiciones vinculadas y no representa todavía toda la cartera.
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-sm text-slate-400" aria-live="polite">Cargando cartera…</div>
      ) : (
        <>
          <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/90 via-slate-900 to-[#102a2a] p-6 shadow-2xl shadow-black/20 sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-28 size-80 rounded-full bg-teal-300/[0.07] blur-3xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="mb-2 text-sm text-slate-400">Valor total estimado</p>
                <p className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{eur(grandTotal)}</p>
                <p className="mt-3 text-sm text-slate-400">Asume que todos los precios registrados ya están expresados en EUR.</p>
              </div>
              {grandTotal > 0 && <SaveSnapshotButton totalValue={grandTotal} breakdown={totals} snapshotAssets={snapshotDetailRows} />}
            </div>
          </section>

          <section aria-label="Distribución por categoría de posición" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {totals.map((total) => (
              <article key={total.category} className="rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-2">
                  <p className="text-sm leading-5 text-slate-400">{total.category}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[total.category]}`}>
                    {grandTotal > 0 ? `${(total.value / grandTotal * 100).toFixed(1)}%` : '0,0%'}
                  </span>
                </div>
                <p className="text-lg font-semibold tracking-tight text-white">{eur(total.value)}</p>
              </article>
            ))}
          </section>

          {investmentAssets.length > 0 && <AllocationComparison data={allocationData} positionsWithTarget={masterTargetsCount} totalPositions={investmentAssets.length} />}

          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <article className="min-w-0 rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 sm:p-5">
              <h2 className="font-semibold text-white">Distribución por categoría</h2>
              <p className="mt-1 text-sm text-slate-400">Valor actual registrado por clase estratégica de posición</p>
              <PortfolioChart data={totals} />
            </article>
            <article className="min-w-0 rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 sm:p-5">
              <h2 className="font-semibold text-white">Evolución del patrimonio</h2>
              <p className="mt-1 text-sm text-slate-400">Snapshots guardados manualmente</p>
              {snapshots.length > 0 ? <TrackRecordChart data={snapshots} /> : <div className="flex min-h-64 items-center text-sm text-slate-400">Guarda un snapshot para iniciar el histórico.</div>}
            </article>
          </section>

          <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 sm:p-5">
            <div>
              <h2 className="font-semibold text-white">Respaldo privado</h2>
              <p className="mt-1 text-sm text-slate-400">Descarga un JSON con posiciones, activos consolidados e histórico.</p>
            </div>
            <ExportBackupButton assets={positions} snapshots={snapshots} investmentAssets={investmentAssets} snapshotAssets={snapshotAssets} disabled={loading || Boolean(errorMessage)} />
          </section>

          <footer className="py-8 text-center text-xs text-slate-600">Datos introducidos y revisados manualmente · Guarda el respaldo en un lugar privado · No es asesoramiento financiero</footer>
        </>
      )}
    </main>
  )
}
