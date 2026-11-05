'use client'

import { useCallback, useEffect, useState } from 'react'
import AddAssetForm from '@/components/AddAssetForm'
import DeleteAssetButton from '@/components/DeleteAssetButton'
import EditAssetButton from '@/components/EditAssetButton'
import PositionImportPanel from '@/components/PositionImportPanel'
import { supabase } from '@/lib/supabase'
import { ESTIMATE_REVIEW_AFTER_DAYS, formatCurrency, getEstimateAgeDays, getPositionOverviewValuation, getPositionValuation, isEstimateDueForReview } from '@/lib/valuation'

type Position = {
  id: string
  name: string
  ticker: string | null
  category: string
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
type AssetLabel = { id: string; name: string }
type ValuationFilter = 'all' | 'pending' | 'valued' | 'estimated' | 'review'

function eur(value: number) {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

export default function PosicionesPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [masterAssets, setMasterAssets] = useState<AssetLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [valuationFilter, setValuationFilter] = useState<ValuationFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const load = useCallback(async () => {
    try {
      const [positionsResult, assetsResult] = await Promise.all([
        supabase.from('assets').select('*').order('category').order('name'),
        supabase.from('investment_assets').select('id,name').order('name'),
      ])
      const failed = positionsResult.error ?? assetsResult.error
      if (failed) throw failed
      setPositions((positionsResult.data ?? []) as Position[])
      setMasterAssets((assetsResult.data ?? []) as AssetLabel[])
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar las posiciones.')
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

  const linkedAssets = new Map(masterAssets.map((asset) => [asset.id, asset.name]))
  const overviewValuations = positions.map((position) => getPositionOverviewValuation(position))
  const confirmedValues = positions.map((position) => getPositionValuation(position).valueEur ?? 0)
  const valuedCount = overviewValuations.filter((valuation) => valuation.quality === 'confirmed').length
  const estimatedCount = overviewValuations.filter((valuation) => valuation.quality === 'estimated').length
  const estimateReviewCount = positions.filter((position) =>
    getPositionOverviewValuation(position).quality === 'estimated' && isEstimateDueForReview(position.estimated_value_as_of),
  ).length
  const unvaluedCount = positions.length - valuedCount - estimatedCount
  const confirmedValueEur = Math.round(confirmedValues.reduce((total, value) => total + value, 0) * 100) / 100
  const estimatedValueEur = Math.round(overviewValuations.reduce((total, valuation) => total + (valuation.quality === 'estimated' ? valuation.valueEur ?? 0 : 0), 0) * 100) / 100
  const indicativeValueEur = confirmedValueEur + estimatedValueEur
  const linkedCount = positions.filter((position) => position.investment_asset_id && linkedAssets.has(position.investment_asset_id)).length
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es-ES')
  const visiblePositions = positions.filter((position) => {
    const quality = getPositionOverviewValuation(position).quality
    const matchesValuation = valuationFilter === 'all'
      || (valuationFilter === 'pending' && quality === 'missing')
      || (valuationFilter === 'valued' && quality === 'confirmed')
      || (valuationFilter === 'estimated' && quality === 'estimated')
      || (valuationFilter === 'review' && quality === 'estimated' && isEstimateDueForReview(position.estimated_value_as_of))
    const searchableText = [position.name, position.ticker, position.broker, linkedAssets.get(position.investment_asset_id ?? '')]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('es-ES')
    return matchesValuation && (!normalizedSearch || searchableText.includes(normalizedSearch))
  })

  return (
    <main className="app-page">
      <header className="mb-7">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Detalle operativo</p>
        <h1 className="text-2xl font-semibold text-white">Posiciones por broker</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Cada fila representa una tenencia en una plataforma. El activo consolidado agrupa la exposición entre plataformas.</p>
      </header>

      {errorMessage && <p role="alert" className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">No se pudieron cargar las posiciones: {errorMessage}</p>}
      {!loading && unvaluedCount > 0 && <p role="status" className="mb-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] px-4 py-3 text-sm leading-6 text-amber-100">{unvaluedCount} posiciones aún no tienen importe en EUR y quedan fuera del total orientativo. Puedes añadir una estimación rápida o completar precio y cambio.</p>}
      {!loading && estimateReviewCount > 0 && <p role="status" className="mb-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] px-4 py-3 text-sm leading-6 text-amber-100">{estimateReviewCount} estimaciones llevan más de {ESTIMATE_REVIEW_AFTER_DAYS} días sin revisar o no tienen fecha. Siguen incluidas en el total orientativo; comprueba si quieres actualizar alguna.</p>}

      <section aria-label="Resumen de posiciones" className="mb-5 grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-white/[0.08] bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">Tenencias registradas</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-white">{loading || errorMessage ? '—' : positions.length}</p>
          <p className="mt-1 text-xs text-slate-500">{loading ? 'Cargando inventario' : errorMessage ? 'No se pudo verificar' : `${valuedCount} con referencias · ${estimatedCount} estimadas · ${unvaluedCount} sin importe`}</p>
        </article>
        <article className="rounded-xl border border-white/[0.08] bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">Valor orientativo de posiciones</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-white">{loading || errorMessage ? '—' : eur(indicativeValueEur)}</p>
          <p className="mt-1 text-xs text-slate-500">{loading || errorMessage ? ' ' : `${eur(confirmedValueEur)} con referencias · ${eur(estimatedValueEur)} estimados`}</p>
        </article>
        <article className="rounded-xl border border-white/[0.08] bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">Vinculadas a un activo</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-white">{loading || errorMessage ? '—' : `${linkedCount} / ${positions.length}`}</p>
          <p className="mt-1 text-xs text-slate-500">{loading ? 'Cargando vínculos' : errorMessage ? 'No se pudo verificar' : `${positions.length - linkedCount} sin vínculo resoluble; no entran en análisis por activo.`}</p>
        </article>
      </section>

      <section aria-label="Acciones de inventario" className="mb-5 grid gap-2">
        <details className="overflow-hidden rounded-xl border border-white/[0.08] bg-slate-900/50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-200 sm:px-5">Añadir posición manual</summary>
          <div className="border-t border-white/[0.08] p-4 sm:p-6">
            <AddAssetForm />
            <p className="mt-3 text-xs leading-5 text-slate-500">Una posición nueva queda sin consolidar hasta vincularla manualmente desde «Activos y objetivos». El peso objetivo de esta fila es antiguo/referencial; no se usa como objetivo global.</p>
          </div>
        </details>
        <details className="overflow-hidden rounded-xl border border-white/[0.08] bg-slate-900/50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-200 sm:px-5">Importar posiciones desde un CSV revisable</summary>
          <div className="border-t border-white/[0.08] pt-5">
            <PositionImportPanel positions={positions} onApplied={load} />
          </div>
        </details>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/70">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-4 sm:px-6">
          <div><h2 className="font-semibold text-white">Tenencias registradas</h2><p className="mt-1 text-sm text-slate-400">Edita cantidades y precios en esta pantalla; gestiona objetivos en el activo consolidado.</p></div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">{positions.length} {positions.length === 1 ? 'posición' : 'posiciones'}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 sm:px-6">
          <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-slate-950/50 p-1" role="group" aria-label="Filtrar por estado de valoración">
            {([
              ['all', 'Todas', positions.length],
              ['pending', 'Pendientes', unvaluedCount],
              ['valued', 'Valoradas', valuedCount],
              ['estimated', 'Estimadas', estimatedCount],
              ['review', 'Revisar estimaciones', estimateReviewCount],
            ] as const).map(([filter, label, count]) => (
              <button
                key={filter}
                type="button"
                id={filter === 'review' ? 'revisar-estimaciones' : undefined}
                aria-pressed={valuationFilter === filter}
                onClick={() => setValuationFilter(filter)}
                className={`rounded-md px-3 py-2 text-xs font-medium transition ${valuationFilter === filter ? 'bg-teal-300/15 text-teal-100' : 'text-slate-400 hover:text-white'}`}
              >
                {label} <span className="ml-1 tabular-nums">{count}</span>
              </button>
            ))}
          </div>
          <label className="grid min-w-52 flex-1 gap-1 text-xs text-slate-400 sm:max-w-xs">
            Buscar posición
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nombre, ticker o broker"
              className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-300/50 focus:outline-none"
            />
          </label>
          <p className="w-full text-xs text-slate-500 sm:w-auto" aria-live="polite">Mostrando {visiblePositions.length} de {positions.length}</p>
        </div>
        {loading ? <p className="p-6 text-sm text-slate-400" aria-live="polite">Cargando posiciones…</p> : positions.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">Todavía no has añadido posiciones.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[1020px] text-left text-sm">
            <thead className="bg-white/[0.025] text-xs uppercase tracking-wider text-slate-400"><tr>
              <th className="px-5 py-3">Posición</th><th className="px-4 py-3">Activo consolidado</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3 text-right">Cantidad</th><th className="px-4 py-3 text-right">P. medio</th><th className="px-4 py-3 text-right">P. actual</th><th className="px-4 py-3 text-right">Valor estimado</th><th className="px-5 py-3 text-right">Acciones</th>
            </tr></thead>
            <tbody className="divide-y divide-white/[0.06]">{visiblePositions.length === 0 ? <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400">No hay posiciones que coincidan con estos filtros.</td></tr> : visiblePositions.map((position) => {
              const valuation = getPositionValuation(position)
              const overviewValuation = getPositionOverviewValuation(position)
              const estimateAgeDays = overviewValuation.quality === 'estimated' ? getEstimateAgeDays(position.estimated_value_as_of) : null
              const estimateNeedsReview = overviewValuation.quality === 'estimated' && isEstimateDueForReview(position.estimated_value_as_of)
              const estimateAgeLabel = estimateAgeDays === null
                ? 'fecha no válida · revisar'
                : estimateAgeDays === 0
                  ? 'hoy'
                  : `hace ${estimateAgeDays} días${estimateNeedsReview ? ' · revisar' : ''}`
              return <tr key={position.id} className="hover:bg-white/[0.025]">
                <td className="px-5 py-4"><p className="font-medium text-slate-100">{position.name}</p><p className="mt-0.5 text-xs text-slate-500">{[position.ticker, position.broker].filter(Boolean).join(' · ') || 'Sin ticker ni broker'}</p><p className={`mt-1 text-xs ${overviewValuation.quality === 'confirmed' ? 'text-emerald-200' : overviewValuation.quality === 'estimated' ? estimateNeedsReview ? 'text-amber-100' : 'text-amber-200' : 'text-slate-400'}`}>{overviewValuation.quality === 'confirmed' ? `${position.currency} · precio ${position.price_as_of} · ${position.price_source}` : overviewValuation.quality === 'estimated' ? `Estimación manual · ${overviewValuation.asOf ?? 'fecha no registrada'} · ${estimateAgeLabel}` : 'Sin importe en EUR'}</p>{!valuation.complete && (position.current_price !== null || position.avg_price !== null) && <p className="mt-1 text-xs text-amber-100/80">Cifras heredadas · moneda o conversión sin confirmar: {position.current_price !== null ? `actual ${position.current_price.toLocaleString('es-ES')}` : ''}{position.current_price !== null && position.avg_price !== null ? ' · ' : ''}{position.avg_price !== null ? `medio ${position.avg_price.toLocaleString('es-ES')}` : ''}</p>}{overviewValuation.reason && overviewValuation.quality === 'missing' && <p className="mt-0.5 max-w-56 text-xs text-amber-200/80">{overviewValuation.reason}</p>}</td>
                <td className="px-4 py-4 text-slate-300">{position.investment_asset_id ? linkedAssets.get(position.investment_asset_id) ?? 'Vínculo no encontrado' : <span className="text-amber-200">Sin vincular</span>}</td>
                <td className="px-4 py-4 text-slate-300">{position.category}</td>
                <td className="px-4 py-4 text-right tabular-nums text-slate-300">{position.quantity === null ? '—' : position.quantity.toLocaleString('es-ES')}</td>
                <td className="px-4 py-4 text-right tabular-nums text-slate-300">{position.avg_price == null ? '—' : position.currency ? formatCurrency(position.avg_price, position.currency) : `${position.avg_price.toLocaleString('es-ES')} · sin moneda`}</td>
                <td className="px-4 py-4 text-right tabular-nums text-slate-300">{position.current_price == null ? '—' : position.currency ? formatCurrency(position.current_price, position.currency) : `${position.current_price.toLocaleString('es-ES')} · sin moneda`}</td>
                <td className={`px-4 py-4 text-right tabular-nums ${overviewValuation.quality === 'estimated' ? 'text-amber-100' : 'text-slate-100'}`} title={overviewValuation.reason ?? undefined}>{overviewValuation.valueEur !== null ? eur(overviewValuation.valueEur) : position.current_price !== null || position.avg_price !== null ? 'No convertido' : 'Pendiente'}</td>
                <td className="px-5 py-4"><div className="flex justify-end gap-2"><EditAssetButton asset={position} /><DeleteAssetButton assetId={position.id} assetName={position.name} /></div></td>
              </tr>
            })}</tbody>
          </table></div>
        )}
      </section>
    </main>
  )
}