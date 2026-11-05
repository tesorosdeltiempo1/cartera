'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AllocationComparison from '@/components/AllocationComparison'
import ExportBackupButton from '@/components/ExportBackupButton'
import SaveSnapshotButton from '@/components/SaveSnapshotButton'
import TrackRecordChart from '@/components/TrackRecordChart'
import { supabase } from '@/lib/supabase'
import { getPositionOverviewValuation, getPositionValuation, getSnapshotValuationDetail, type SnapshotValuationDetail } from '@/lib/valuation'
import { normalizeLedgerSummary, summarizePositionReturns, type LedgerSummary, type LedgerSummaryResponse } from '@/lib/ledger'

type Category = 'Núcleo Pasivo' | 'Satélite Convicción' | 'Seguridad y Liquidez' | 'Activos Duros' | 'Especulativo'
type Position = {
  id: string
  name: string
  ticker: string | null
  category: Category
  broker: string | null
  quantity: number | null
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
  estimated_value_eur: number | null
  estimated_value_as_of: string | null
  cost_basis_eur: number | null
  ledger_started_at: string | null
}
type InvestmentAsset = { id: string; name: string; category: Category; target_weight: number | null }
type Snapshot = { id: string; snapshot_date: string; total_value: number; breakdown: Record<string, number> }
type SnapshotAsset = { snapshot_id: string; investment_asset_id: string | null; asset_name: string; category: Category; value: number; target_weight: number | null; valuation_detail: SnapshotValuationDetail[]; confirmed_value: number; estimated_value: number }
type SnapshotCash = { cash_account_id: string; broker: string; currency: string; balance: number; fx_rate_to_eur: number; fx_as_of: string | null; fx_source: string | null; value_eur: number }

const CATEGORIES: Category[] = ['Núcleo Pasivo', 'Satélite Convicción', 'Seguridad y Liquidez', 'Activos Duros', 'Especulativo']

function valueOf(position: Position) {
  return getPositionOverviewValuation(position).valueEur ?? 0
}

function eur(value: number) {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

function dateLabel(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-ES', options)
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
  const confirmedPositionValue = positions.reduce((sum, position) => sum + (getPositionValuation(position).valueEur ?? 0), 0)
  const estimatedPositionValue = positions.reduce((sum, position) => {
    const valuation = getPositionOverviewValuation(position)
    return sum + (valuation.quality === 'estimated' ? valuation.valueEur ?? 0 : 0)
  }, 0)
  const confirmedTotal = confirmedPositionValue + cashTotalEur
  const confirmedValuationDates = [
    ...positions.flatMap((position) => {
      if (!getPositionValuation(position).complete) return []
      return [
        position.price_as_of,
        ...(position.currency?.toUpperCase() === 'EUR' ? [] : [position.fx_as_of]),
      ].filter((date): date is string => date !== null)
    }),
    ...cashSummary
      .flatMap((account) => account.currency !== 'EUR' && account.fx_as_of ? [account.fx_as_of] : []),
  ].sort()
  const estimatedValuationDates = positions.flatMap((position) =>
    getPositionOverviewValuation(position).quality === 'estimated' && position.estimated_value_as_of
      ? [position.estimated_value_as_of]
      : [],
  ).sort()
  const firstValuationDate = confirmedValuationDates[0]
  const lastValuationDate = confirmedValuationDates.at(-1)
  const firstEstimateDate = estimatedValuationDates[0]
  const lastEstimateDate = estimatedValuationDates.at(-1)
  const latestSnapshot = snapshots.at(-1)
  const totals = CATEGORIES.map((category) => ({
    category,
    value: positions.filter((position) => position.category === category).reduce((sum, position) => sum + valueOf(position), 0)
      + (category === 'Seguridad y Liquidez' ? cashTotalEur : 0),
  }))
  const grandTotal = totals.reduce((sum, total) => sum + total.value, 0)
  const categoryComposition = [...totals].filter((total) => total.value > 0).sort((left, right) => right.value - left.value)
  const largestCategory = categoryComposition[0]
  const linkedCount = positions.length - positions.filter((position) => !position.investment_asset_id).length
  const valuedPositionsCount = positions.filter((position) => getPositionValuation(position).complete).length
  const estimatedPositionsCount = positions.filter((position) => getPositionOverviewValuation(position).quality === 'estimated').length
  const identifiedExposures = [
    ...investmentAssets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      value: positions
        .filter((position) => position.investment_asset_id === asset.id)
        .reduce((sum, position) => sum + valueOf(position), 0),
    })),
    ...positions
      .filter((position) => !position.investment_asset_id)
      .map((position) => ({
        id: position.id,
        name: `${position.name}${position.broker ? ` · ${position.broker}` : ''} (sin consolidar)`,
        value: valueOf(position),
      })),
  ].filter((exposure) => exposure.value > 0).sort((left, right) => right.value - left.value).slice(0, 3)
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
      hasTargetAssets: categoryAssets.length > 0,
      targetComplete: categoryAssets.length > 0 && categoryAssets.every((asset) => asset.target_weight !== null),
    }
  })
  const unlinkedCount = positions.filter((position) => !position.investment_asset_id).length
  const unvaluedPositions = positions.filter((position) => getPositionOverviewValuation(position).quality === 'missing')
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
      const confirmedValue = linkedPositions.reduce((sum, position) => sum + (getPositionValuation(position).valueEur ?? 0), 0)
      const estimatedValue = linkedPositions.reduce((sum, position) => {
        const valuation = getPositionOverviewValuation(position)
        return sum + (valuation.quality === 'estimated' ? valuation.valueEur ?? 0 : 0)
      }, 0)
      return {
        investment_asset_id: asset.id,
        asset_name: asset.name,
        category: asset.category,
        value: confirmedValue + estimatedValue,
        target_weight: asset.target_weight,
        valuation_detail: linkedPositions.map(getSnapshotValuationDetail).filter((detail): detail is SnapshotValuationDetail => detail !== null),
        confirmed_value: confirmedValue,
        estimated_value: estimatedValue,
      }
    }),
    ...positions.filter((position) => !position.investment_asset_id).map((position) => ({
      investment_asset_id: null,
      asset_name: `Sin vincular: ${position.name}${position.broker ? ` · ${position.broker}` : ''}`,
      category: position.category,
      value: valueOf(position),
      target_weight: null,
      valuation_detail: [getSnapshotValuationDetail(position)].filter((detail): detail is SnapshotValuationDetail => detail !== null),
      confirmed_value: getPositionValuation(position).valueEur ?? 0,
      estimated_value: getPositionOverviewValuation(position).quality === 'estimated' ? getPositionOverviewValuation(position).valueEur ?? 0 : 0,
    })),
  ]

  return (
    <main className="dashboard-home">
      {errorMessage && <div role="alert" className="mb-6 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">No se pudieron cargar los datos: {errorMessage}</div>}
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-sm text-slate-400" aria-live="polite">Cargando cartera…</div>
      ) : (
        <>
          <section className="home-overview" aria-labelledby="dashboard-title">
            <header className="overview-heading">
              <div>
                <p className="home-eyebrow">AUREUM <span aria-hidden="true">/</span> RESUMEN FINANCIERO</p>
                <h1 id="dashboard-title">Cartera actual</h1>
              </div>
              <p className="home-date">Consulta · {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
            </header>
            <div className="overview-main">
              <div className="home-total-block">
                <p className="home-total-label">Valor orientativo de posiciones y efectivo · EUR</p>
                <p className="home-total tabular-nums">{eur(grandTotal)}</p>
                <p className="overview-scope">
                  {estimatedPositionsCount > 0 && <>{eur(confirmedTotal)} con referencias + {eur(estimatedPositionValue)} estimados manualmente. </>}
                  {unvaluedPositions.length > 0
                    ? <>{unvaluedPositions.length} posición(es) sin importe conocido quedan fuera de este total. <Link href="/posiciones">Revisarlas</Link>.</>
                    : 'Los valores pueden no corresponder al día de hoy.'}
                  {' '}Inmuebles y deuda se consultan en <Link href="/patrimonio">Patrimonio</Link>.
                </p>
              </div>
              <dl className="overview-metrics">
                <div>
                  <dt>Valoraciones con referencia</dt>
                  <dd>{valuedPositionsCount}<span> / {positions.length}</span></dd>
                  <p>{estimatedPositionsCount} estimadas · {unvaluedPositions.length} sin importe</p>
                </div>
                <div>
                  <dt>Efectivo registrado</dt>
                  <dd>{eur(cashTotalEur)}</dd>
                  <p>{grandTotal > 0 ? `${(cashTotalEur / grandTotal * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })}% del total valorado` : 'Sin total valorado'}</p>
                </div>
                <div>
                  <dt>Posiciones consolidadas</dt>
                  <dd>{linkedCount}<span> / {positions.length}</span></dd>
                  <p>vinculadas a un activo maestro</p>
                </div>
              </dl>
            </div>
            <div className="overview-footer">
              <p>
                <span>Referencias detalladas</span>
                <strong>{firstValuationDate && lastValuationDate
                  ? `${dateLabel(firstValuationDate)} — ${dateLabel(lastValuationDate)}`
                  : 'Sin fechas documentadas'}</strong>
              </p>
              {estimatedPositionsCount > 0 && <p>
                <span>Estimaciones manuales</span>
                <strong>{firstEstimateDate && lastEstimateDate
                  ? `${dateLabel(firstEstimateDate)} — ${dateLabel(lastEstimateDate)}`
                  : 'Fecha no disponible'}</strong>
              </p>}
              <p>
                <span>Último corte histórico</span>
                <strong>{latestSnapshot ? dateLabel(latestSnapshot.snapshot_date) : 'Aún no hay cortes'}</strong>
              </p>
              {grandTotal > 0 && <SaveSnapshotButton totalValue={grandTotal} breakdown={totals} snapshotAssets={snapshotDetailRows} cashBreakdown={cashSnapshotRows} disabled={unvaluedPositions.length > 0} />}
            </div>
          </section>

          <section className="dashboard-reading" aria-labelledby="reading-title">
            <header className="reading-heading">
              <div>
                <p className="home-kicker">ESTRUCTURA Y COBERTURA</p>
                <h2 id="reading-title">Lectura de cartera</h2>
              </div>
              {largestCategory && grandTotal > 0 && (
                <p className="reading-lead">
                  Mayor bloque: <strong>{largestCategory.category}</strong>, {eur(largestCategory.value)} ({(largestCategory.value / grandTotal * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })}%).
                </p>
              )}
            </header>
            <div className="reading-grid">
              <section className="reading-panel" aria-labelledby="category-title">
                <h3 id="category-title">Composición por categoría</h3>
                <p>Importes con referencias y estimaciones; efectivo en Seguridad y Liquidez.</p>
                {categoryComposition.length > 0
                  ? <ol className="composition-list">
                    {categoryComposition.map((item) => {
                      const share = grandTotal > 0 ? item.value / grandTotal * 100 : 0
                      return (
                        <li key={item.category}>
                          <div className="composition-label">
                            <span>{item.category}</span>
                            <strong>{eur(item.value)}</strong>
                          </div>
                          <div className="composition-track" aria-hidden="true">
                            <span style={{ width: `${share}%` }} />
                          </div>
                          <span className="composition-share">{share.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
                        </li>
                      )
                    })}
                  </ol>
                  : <p className="reading-empty">Todavía no hay importes con valoración EUR.</p>}
              </section>
              <section className="reading-panel" aria-labelledby="exposure-title">
                <h3 id="exposure-title">Mayores exposiciones registradas</h3>
                <p>Activos vinculados o posiciones individuales aún sin consolidar.</p>
                {identifiedExposures.length > 0 ? (
                  <ol className="exposure-list">
                    {identifiedExposures.map((exposure, index) => (
                      <li key={exposure.id}>
                        <span className="exposure-rank">{String(index + 1).padStart(2, '0')}</span>
                        <span className="exposure-name">{exposure.name}</span>
                        <strong>{eur(exposure.value)}</strong>
                        <span className="exposure-share">{grandTotal > 0 ? `${(exposure.value / grandTotal * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })}%` : '—'}</span>
                      </li>
                    ))}
                  </ol>
                ) : <p className="reading-empty">No hay exposiciones valoradas para ordenar.</p>}
                <p className="reading-caveat">La consolidación depende de los vínculos registrados; no modela exposiciones indirectas, derivados ni riesgo de emisor.</p>
              </section>
            </div>
          </section>

          {(unlinkedCount > 0 || unvaluedPositions.length > 0) && (
            <details className="dashboard-disclosure">
              <summary className="disclosure-summary">
                <span><span className="disclosure-title">Revisión de datos</span><span className="disclosure-subtitle">{unlinkedCount + unvaluedPositions.length} alertas necesitan atención</span></span><span className="disclosure-mark" aria-hidden="true" />
              </summary>
              <div className="disclosure-body">
                {unlinkedCount > 0 && <p>{unlinkedCount} posiciones sin vincular a un activo consolidado; la comparación por activo no representa toda la cartera.</p>}
                {unvaluedPositions.length > 0 && <div>
                  <p>{unvaluedPositions.length} posiciones no tienen aún una cifra en EUR. Puedes añadir una estimación total sin precio ni cambio, o refinarla con los datos de cotización.</p>
                  {legacyPriceCount > 0 && <p className="mt-1">{legacyPriceCount} precios heredados no tienen moneda confirmada y podrían estar en monedas distintas.</p>}
                  <Link href="/posiciones" className="mt-2 inline-flex font-semibold text-teal-200 underline decoration-teal-200/40 underline-offset-4">Revisar posiciones</Link>
                </div>}
                {estimatedPositionsCount > 0 && <p>{estimatedPositionsCount} valoraciones son estimaciones manuales; se incluyen en el total orientativo, no en la rentabilidad del ledger.</p>}
              </div>
            </details>
          )}

          <div className="dashboard-sections">
            <details className="dashboard-disclosure" open>
              <summary className="disclosure-summary">
                <span><span className="disclosure-title">Objetivos</span><span className="disclosure-subtitle">Asignación actual frente a los objetivos registrados</span></span><span className="disclosure-mark" aria-hidden="true" />
              </summary>
              <div className="disclosure-body">
                {investmentAssets.length > 0
                  ? <AllocationComparison data={allocationData} positionsWithTarget={masterTargetsCount} totalPositions={investmentAssets.length} />
                  : <p>Aún no hay activos consolidados para comparar objetivos. Puedes crearlos en <Link href="/activos" className="font-medium text-teal-200 underline underline-offset-4">Activos y objetivos</Link>.</p>}
              </div>
            </details>

            <details className="dashboard-disclosure">
              <summary className="disclosure-summary">
                <span><span className="disclosure-title">Rentabilidad</span><span className="disclosure-subtitle">Resultados realizados y pendientes</span></span><span className="disclosure-mark" aria-hidden="true" />
              </summary>
              <section aria-label="Rentabilidad del ledger" className="disclosure-body grid gap-3 sm:grid-cols-3">
                <article className="dashboard-stat-card p-4">
                  <p className="text-xs text-slate-400">Ganancia / pérdida realizada</p>
                  <p className={`mt-2 text-xl tabular-nums ${realizedPnlEur >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>{eur(realizedPnlEur)}</p>
                  <p className="mt-1 text-xs text-slate-500">Ventas, dividendos, intereses y comisiones desde el saldo inicial.</p>
                </article>
                <article className="dashboard-stat-card p-4">
                  <p className="text-xs text-slate-400">Ganancia / pérdida no realizada</p>
                  <p className={`mt-2 text-xl tabular-nums ${unrealizedPnlEur >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>{eur(unrealizedPnlEur)}</p>
                  <p className="mt-1 text-xs text-slate-500">Solo posiciones con ledger iniciado y valor EUR confirmado.</p>
                </article>
                <article className="dashboard-stat-card p-4">
                  <p className="text-xs text-slate-400">Resultado total del ledger</p>
                  <p className={`mt-2 text-xl tabular-nums ${totalPnlEur >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>{eur(totalPnlEur)}</p>
                  <p className="mt-1 text-xs text-slate-500">Realizado + no realizado; excluye aportaciones y retiradas.</p>
                </article>
              </section>
            </details>

            <details className="dashboard-disclosure">
              <summary className="disclosure-summary">
                <span><span className="disclosure-title">Evolución</span><span className="disclosure-subtitle">{snapshots.length} {snapshots.length === 1 ? 'corte registrado' : 'cortes registrados'}</span></span><span className="disclosure-mark" aria-hidden="true" />
              </summary>
              <section className="disclosure-body min-w-0">
                <h2 className="font-semibold text-white">Evolución del patrimonio</h2>
                <p className="mt-1 text-sm text-slate-400">Cortes puntuales de valor; no representan una rentabilidad ajustada por aportaciones y retiradas.</p>
                {snapshots.length > 0 ? <TrackRecordChart data={snapshots} /> : <div className="flex min-h-64 items-center text-sm text-slate-400">Guarda un corte para iniciar el histórico.</div>}
              </section>
            </details>

            <details className="dashboard-disclosure">
              <summary className="disclosure-summary">
                <span><span className="disclosure-title">Respaldo privado</span><span className="disclosure-subtitle">Descarga tus datos patrimoniales</span></span><span className="disclosure-mark" aria-hidden="true" />
              </summary>
              <section className="disclosure-body flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-slate-400">JSON · posiciones, activos, operaciones, inmuebles e histórico.</p>
                <ExportBackupButton disabled={loading || Boolean(errorMessage)} />
              </section>
            </details>
          </div>

          <footer className="home-footer">Datos revisados manualmente · Guarda el respaldo en privado · No es asesoramiento financiero</footer>
        </>
      )}
    </main>
  )
}
