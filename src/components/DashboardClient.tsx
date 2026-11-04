'use client'

import { useCallback, useEffect, useState } from 'react'
import AllocationComparison from '@/components/AllocationComparison'
import ExportBackupButton from '@/components/ExportBackupButton'
import PortfolioChart from '@/components/PortfolioChart'
import SaveSnapshotButton from '@/components/SaveSnapshotButton'
import TrackRecordChart from '@/components/TrackRecordChart'
import { supabase } from '@/lib/supabase'
import { getPositionValuation, getSnapshotValuationDetail, type SnapshotValuationDetail } from '@/lib/valuation'
import { normalizeLedgerSummary, summarizePositionReturns, type LedgerSummary, type LedgerSummaryResponse } from '@/lib/ledger'

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
  currency: string | null
  price_as_of: string | null
  price_source: string | null
  fx_rate_to_eur: number | null
  fx_as_of: string | null
  fx_source: string | null
  cost_basis_eur: number | null
  ledger_started_at: string | null
}
type InvestmentAsset = { id: string; name: string; category: Category; target_weight: number | null }
type Snapshot = { id: string; snapshot_date: string; total_value: number; breakdown: Record<string, number> }
type SnapshotAsset = { snapshot_id: string; investment_asset_id: string | null; asset_name: string; category: Category; value: number; target_weight: number | null; valuation_detail: SnapshotValuationDetail[] }
type SnapshotCash = { cash_account_id: string; broker: string; currency: string; balance: number; fx_rate_to_eur: number; fx_as_of: string | null; fx_source: string | null; value_eur: number }

const CATEGORIES: Category[] = ['Núcleo Pasivo', 'Satélite Convicción', 'Seguridad y Liquidez', 'Activos Duros', 'Especulativo']
const CATEGORY_STYLES: Record<Category, string> = {
  'Núcleo Pasivo': 'border-sky-900/15 bg-sky-900/5 text-sky-950',
  'Satélite Convicción': 'border-amber-900/15 bg-amber-900/5 text-amber-950',
  'Seguridad y Liquidez': 'border-violet-900/15 bg-violet-900/5 text-violet-950',
  'Activos Duros': 'border-orange-900/15 bg-orange-900/5 text-orange-950',
  Especulativo: 'border-emerald-900/15 bg-emerald-900/5 text-emerald-950',
}

function valueOf(position: Position) {
  return getPositionValuation(position).valueEur ?? 0
}

function eur(value: number) {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

export default function DashboardClient() {
  const [positions, setPositions] = useState<Position[]>([])
  const [investmentAssets, setInvestmentAssets] = useState<InvestmentAsset[]>([])
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummary>({ transaction_count: 0, realized_total_eur: 0, realized_by_position: [], cash_accounts: [] })
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadDashboard = useCallback(async () => {
    try {
      const [positionsResult, investmentsResult, snapshotsResult, ledgerSummaryResult] = await Promise.all([
        supabase.from('assets').select('*').order('category').order('name'),
        supabase.from('investment_assets').select('*').order('name'),
        supabase.from('portfolio_snapshots').select('*').order('snapshot_date'),
        supabase.rpc('get_portfolio_ledger_summary'),
      ])
      const failed = positionsResult.error ?? investmentsResult.error ?? snapshotsResult.error ?? ledgerSummaryResult.error
      if (failed) throw failed
      if (!ledgerSummaryResult.data) throw new Error('No se recibió el resumen del ledger.')
      setPositions((positionsResult.data ?? []) as Position[])
      setInvestmentAssets((investmentsResult.data ?? []) as InvestmentAsset[])
      setSnapshots((snapshotsResult.data ?? []) as Snapshot[])
      setLedgerSummary(normalizeLedgerSummary(ledgerSummaryResult.data as LedgerSummaryResponse))
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

  const cashSummary = ledgerSummary.cash_accounts
  const cashTotalEur = cashSummary.reduce((sum, account) => sum + account.balanceEur, 0)
  const totals = CATEGORIES.map((category) => ({
    category,
    value: positions.filter((position) => position.category === category).reduce((sum, position) => sum + valueOf(position), 0)
      + (category === 'Seguridad y Liquidez' ? cashTotalEur : 0),
  }))
  const grandTotal = totals.reduce((sum, total) => sum + total.value, 0)
  const allocationData = CATEGORIES.map((category) => {
    const categoryAssets = investmentAssets.filter((asset) => asset.category === category)
    const categoryPositions = positions.filter((position) =>
      categoryAssets.some((asset) => asset.id === position.investment_asset_id),
    )
    return {
      category,
      actualWeight: grandTotal > 0 ? (categoryPositions.reduce((sum, position) => sum + valueOf(position), 0) + (category === 'Seguridad y Liquidez' ? cashTotalEur : 0)) / grandTotal * 100 : 0,
      targetWeight: categoryAssets.reduce((sum, asset) => sum + (asset.target_weight ?? 0), 0),
      hasPositions: categoryAssets.length > 0 || (category === 'Seguridad y Liquidez' && cashSummary.length > 0),
      targetComplete: categoryAssets.length > 0 && categoryAssets.every((asset) => asset.target_weight !== null),
    }
  })
  const unlinkedCount = positions.filter((position) => !position.investment_asset_id).length
  const unvaluedPositions = positions.filter((position) => !getPositionValuation(position).complete)
  const legacyPriceCount = unvaluedPositions.filter((position) => position.current_price !== null || position.avg_price !== null).length
  const masterTargetsCount = investmentAssets.filter((asset) => asset.target_weight !== null).length
  const valuationByPosition = new Map(positions.map((position) => [position.id, getPositionValuation(position).valueEur]))
  const positionReturns = summarizePositionReturns(
    positions,
    [],
    valuationByPosition,
    new Map(ledgerSummary.realized_by_position.map((item) => [item.position_id, item.realized_eur])),
  )
  const trackedReturns = positionReturns.filter((item) => item.tracked)
  const realizedPnlEur = ledgerSummary.realized_total_eur
  const unrealizedPnlEur = trackedReturns.reduce((sum, item) => sum + (item.unrealizedEur ?? 0), 0)
  const totalPnlEur = realizedPnlEur + unrealizedPnlEur
  const cashSnapshotRows: SnapshotCash[] = cashSummary.map((account) => ({
    cash_account_id: account.id,
    broker: account.broker,
    currency: account.currency,
    balance: account.balance,
    fx_rate_to_eur: Number(account.current_fx_rate_to_eur),
    fx_as_of: account.fx_as_of,
    fx_source: account.fx_source,
    value_eur: account.balanceEur,
  }))
  const snapshotDetailRows: Omit<SnapshotAsset, 'snapshot_id'>[] = [
    ...investmentAssets.map((asset) => {
      const linkedPositions = positions.filter((position) => position.investment_asset_id === asset.id)
      return {
        investment_asset_id: asset.id,
        asset_name: asset.name,
        category: asset.category,
        value: linkedPositions.reduce((sum, position) => sum + valueOf(position), 0),
        target_weight: asset.target_weight,
        valuation_detail: linkedPositions.map(getSnapshotValuationDetail).filter((detail): detail is SnapshotValuationDetail => detail !== null),
      }
    }),
    ...positions.filter((position) => !position.investment_asset_id).map((position) => ({
      investment_asset_id: null,
      asset_name: `Sin vincular: ${position.name}${position.broker ? ` · ${position.broker}` : ''}`,
      category: position.category,
      value: valueOf(position),
      target_weight: null,
      valuation_detail: [getSnapshotValuationDetail(position)].filter((detail): detail is SnapshotValuationDetail => detail !== null),
    })),
  ]

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 text-slate-100 sm:px-6 sm:py-10 lg:px-8">
      {errorMessage && <div role="alert" className="mb-6 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">No se pudieron cargar los datos: {errorMessage}</div>}
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-sm text-slate-400" aria-live="polite">Cargando cartera…</div>
      ) : (
        <>
          <section className="marble-panel relative mb-5 overflow-hidden p-6 sm:p-9 lg:p-12">
            <div className="relative z-10">
              <p className="brand-wordmark text-[10px] font-bold uppercase tracking-[0.24em] text-stone-600">Aureum · Patrimonio personal</p>
              <h1 className="mt-5 max-w-3xl font-display text-3xl leading-tight text-stone-900 sm:text-5xl">La medida de tu legado</h1>
              <div className="mt-8 border-y border-stone-900/15 py-6 sm:py-8">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">
                  {unvaluedPositions.length ? 'Subtotal confirmado · EUR' : 'Patrimonio registrado · EUR'}
                </p>
                <p className="marble-total tabular-nums">{eur(grandTotal)}</p>
              </div>
              <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
                <p className="max-w-md text-xs leading-5 text-stone-600 sm:text-sm">
                  Valoración manual · sin cotizaciones automáticas
                  {snapshots.length > 0 && <span className="block">Último corte: {new Date(`${snapshots.at(-1)?.snapshot_date}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                </p>
                {grandTotal > 0 && <SaveSnapshotButton totalValue={grandTotal} breakdown={totals} snapshotAssets={snapshotDetailRows} cashBreakdown={cashSnapshotRows} disabled={unvaluedPositions.length > 0} />}
              </div>
            </div>
          </section>

          {(unlinkedCount > 0 || unvaluedPositions.length > 0) && (
            <details className="marble-tile mb-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-semibold text-stone-800">
                <span>Revisión de datos · {unlinkedCount + unvaluedPositions.length} alertas</span><span className="disclosure-mark" aria-hidden="true" />
              </summary>
              <div className="grid gap-3 border-t border-stone-900/10 px-4 py-4 text-sm leading-6 text-stone-700">
                {unlinkedCount > 0 && <p>{unlinkedCount} posiciones sin vincular a un activo consolidado; la comparación por activo no representa toda la cartera.</p>}
                {unvaluedPositions.length > 0 && <div>
                  <p>{unvaluedPositions.length} posiciones requieren confirmar moneda, precio fechado y tipo de cambio. Sus cifras originales siguen disponibles en Posiciones, pero no se suman como euros ni entran en snapshots nuevos.</p>
                  {legacyPriceCount > 0 && <p className="mt-1">{legacyPriceCount} precios heredados no tienen moneda confirmada y podrían estar en monedas distintas.</p>}
                  <a href="/posiciones" className="mt-2 inline-flex font-semibold text-stone-950 underline decoration-stone-500/50 underline-offset-4">Revisar posiciones →</a>
                </div>}
              </div>
            </details>
          )}

          <div className="grid gap-3">
            <details className="marble-tile">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-5">
                <span><span className="block font-semibold text-stone-900">Composición</span><span className="mt-1 block text-xs text-stone-600">Distribución, objetivos y porcentajes</span></span><span className="disclosure-mark" aria-hidden="true" />
              </summary>
              <div className="grid gap-4 border-t border-stone-900/10 p-4 sm:p-5">
                <section aria-label="Distribución por categoría de posición" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {totals.map((total) => (
                    <article key={total.category} className="marble-tile marble-tile-inset p-4">
                      <div className="mb-4 flex items-start justify-between gap-2">
                        <p className="text-sm leading-5 text-stone-600">{total.category}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[total.category]}`}>
                          {grandTotal > 0 ? `${(total.value / grandTotal * 100).toFixed(1)}%` : '0,0%'}
                        </span>
                      </div>
                      <p className="text-lg font-semibold tracking-tight text-stone-900">{eur(total.value)}</p>
                    </article>
                  ))}
                </section>
                {investmentAssets.length > 0 && unvaluedPositions.length === 0 && <AllocationComparison data={allocationData} positionsWithTarget={masterTargetsCount} totalPositions={investmentAssets.length} />}
                <article className="marble-tile marble-tile-inset min-w-0 p-4 sm:p-5">
                  <h2 className="font-semibold text-stone-900">Distribución por categoría</h2>
                  <p className="mt-1 text-sm text-stone-600">{unvaluedPositions.length ? 'Solo valoraciones EUR confirmadas; las posiciones pendientes se excluyen.' : 'Valor actual registrado por clase estratégica de posición'}</p>
                  <PortfolioChart data={totals} />
                </article>
              </div>
            </details>

            <details className="marble-tile">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-5">
                <span><span className="block font-semibold text-stone-900">Rentabilidad</span><span className="mt-1 block text-xs text-stone-600">Resultados realizados y pendientes</span></span><span className="disclosure-mark" aria-hidden="true" />
              </summary>
              <section aria-label="Rentabilidad del ledger" className="grid gap-3 border-t border-stone-900/10 p-4 sm:grid-cols-3 sm:p-5">
                <article className="marble-tile marble-tile-inset p-4">
                  <p className="text-xs text-stone-600">Ganancia / pérdida realizada</p>
                  <p className={`mt-2 text-xl tabular-nums ${realizedPnlEur >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>{eur(realizedPnlEur)}</p>
                  <p className="mt-1 text-xs text-stone-600">Ventas, dividendos, intereses y comisiones desde el saldo inicial.</p>
                </article>
                <article className="marble-tile marble-tile-inset p-4">
                  <p className="text-xs text-stone-600">Ganancia / pérdida no realizada</p>
                  <p className={`mt-2 text-xl tabular-nums ${unrealizedPnlEur >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>{eur(unrealizedPnlEur)}</p>
                  <p className="mt-1 text-xs text-stone-600">Solo posiciones con ledger iniciado y valor EUR confirmado.</p>
                </article>
                <article className="marble-tile marble-tile-inset p-4">
                  <p className="text-xs text-stone-600">Resultado total del ledger</p>
                  <p className={`mt-2 text-xl tabular-nums ${totalPnlEur >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>{eur(totalPnlEur)}</p>
                  <p className="mt-1 text-xs text-stone-600">Realizado + no realizado; excluye aportaciones y retiradas.</p>
                </article>
              </section>
            </details>

            <details className="marble-tile">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-5">
                <span><span className="block font-semibold text-stone-900">Evolución</span><span className="mt-1 block text-xs text-stone-600">{snapshots.length} snapshots registrados</span></span><span className="disclosure-mark" aria-hidden="true" />
              </summary>
              <section className="min-w-0 border-t border-stone-900/10 p-4 sm:p-5">
                <h2 className="font-semibold text-stone-900">Evolución del patrimonio</h2>
                <p className="mt-1 text-sm text-stone-600">Snapshots guardados manualmente</p>
                {snapshots.length > 0 ? <TrackRecordChart data={snapshots} /> : <div className="flex min-h-64 items-center text-sm text-stone-600">Guarda un snapshot para iniciar el histórico.</div>}
              </section>
            </details>

            <details className="marble-tile">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-5">
                <span><span className="block font-semibold text-stone-900">Respaldo privado</span><span className="mt-1 block text-xs text-stone-600">Descarga tus datos patrimoniales</span></span><span className="disclosure-mark" aria-hidden="true" />
              </summary>
              <section className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-900/10 p-4 sm:p-5">
                <p className="text-sm text-stone-600">JSON · posiciones, activos, operaciones, inmuebles e histórico.</p>
                <ExportBackupButton disabled={loading || Boolean(errorMessage)} />
              </section>
            </details>
          </div>

          <footer className="py-8 text-center text-xs text-slate-500">Datos revisados manualmente · Guarda el respaldo en privado · No es asesoramiento financiero</footer>
        </>
      )}
    </main>
  )
}
