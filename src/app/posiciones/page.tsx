'use client'

import { useCallback, useEffect, useState } from 'react'
import AddAssetForm from '@/components/AddAssetForm'
import DeleteAssetButton from '@/components/DeleteAssetButton'
import EditAssetButton from '@/components/EditAssetButton'
import { supabase } from '@/lib/supabase'
import { formatCurrency, getPositionValuation } from '@/lib/valuation'

type Position = {
  id: string
  name: string
  ticker: string | null
  category: string
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
type AssetLabel = { id: string; name: string }
type ValuationFilter = 'all' | 'pending' | 'valued'

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
  const unvaluedCount = positions.filter((position) => !getPositionValuation(position).complete).length
  const valuedCount = positions.length - unvaluedCount
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es-ES')
  const visiblePositions = positions.filter((position) => {
    const valued = getPositionValuation(position).complete
    const matchesValuation = valuationFilter === 'all' || (valuationFilter === 'valued' ? valued : !valued)
    const searchableText = [position.name, position.ticker, position.broker, linkedAssets.get(position.investment_asset_id ?? '')]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('es-ES')
    return matchesValuation && (!normalizedSearch || searchableText.includes(normalizedSearch))
  })

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <header className="mb-7">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Detalle operativo</p>
        <h1 className="text-2xl font-semibold text-white">Posiciones por broker</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Cada fila representa una tenencia en una plataforma. El activo consolidado agrupa la exposición entre plataformas.</p>
      </header>

      {errorMessage && <p role="alert" className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">No se pudieron cargar las posiciones: {errorMessage}</p>}
      {!loading && unvaluedCount > 0 && <p role="status" className="mb-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] px-4 py-3 text-sm leading-6 text-amber-100">{unvaluedCount} posiciones necesitan moneda, precio con fecha/origen o tipo de cambio para incluirse en totales en EUR. Edítalas aquí; los valores desconocidos no se convierten automáticamente.</p>}

      <section className="mb-6 rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Añadir posición en un broker</h2>
        <AddAssetForm />
        <p className="mt-3 text-xs leading-5 text-slate-500">Una posición nueva queda sin consolidar hasta vincularla manualmente desde «Activos y objetivos». El peso objetivo de esta fila es antiguo/referencial; no se usa como objetivo global.</p>
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
            ] as const).map(([filter, label, count]) => (
              <button
                key={filter}
                type="button"
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
              return <tr key={position.id} className="hover:bg-white/[0.025]">
                <td className="px-5 py-4"><p className="font-medium text-slate-100">{position.name}</p><p className="mt-0.5 text-xs text-slate-500">{[position.ticker, position.broker].filter(Boolean).join(' · ') || 'Sin ticker ni broker'}</p><p className={`mt-1 text-xs ${valuation.complete ? 'text-emerald-200' : 'text-amber-200'}`}>{valuation.complete ? `${position.currency} · precio ${position.price_as_of} · ${position.price_source}` : 'Valoración pendiente'}</p>{!valuation.complete && (position.current_price !== null || position.avg_price !== null) && <p className="mt-1 text-xs text-amber-100/80">Cifras heredadas · moneda sin confirmar: {position.current_price !== null ? `actual ${position.current_price.toLocaleString('es-ES')}` : ''}{position.current_price !== null && position.avg_price !== null ? ' · ' : ''}{position.avg_price !== null ? `medio ${position.avg_price.toLocaleString('es-ES')}` : ''}</p>}{valuation.reason && <p className="mt-0.5 max-w-56 text-xs text-amber-200/80">{valuation.reason}</p>}</td>
                <td className="px-4 py-4 text-slate-300">{position.investment_asset_id ? linkedAssets.get(position.investment_asset_id) ?? 'Vínculo no encontrado' : <span className="text-amber-200">Sin vincular</span>}</td>
                <td className="px-4 py-4 text-slate-300">{position.category}</td>
                <td className="px-4 py-4 text-right tabular-nums text-slate-300">{position.quantity.toLocaleString('es-ES')}</td>
                <td className="px-4 py-4 text-right tabular-nums text-slate-300">{position.avg_price == null ? '—' : position.currency ? formatCurrency(position.avg_price, position.currency) : `${position.avg_price.toLocaleString('es-ES')} · sin moneda`}</td>
                <td className="px-4 py-4 text-right tabular-nums text-slate-300">{position.current_price == null ? '—' : position.currency ? formatCurrency(position.current_price, position.currency) : `${position.current_price.toLocaleString('es-ES')} · sin moneda`}</td>
                <td className="px-4 py-4 text-right tabular-nums text-slate-100" title={valuation.reason ?? undefined}>{valuation.complete && valuation.valueEur !== null ? eur(valuation.valueEur) : position.current_price !== null || position.avg_price !== null ? 'No convertido' : 'Pendiente'}</td>
                <td className="px-5 py-4"><div className="flex justify-end gap-2"><EditAssetButton asset={position} /><DeleteAssetButton assetId={position.id} assetName={position.name} /></div></td>
              </tr>
            })}</tbody>
          </table></div>
        )}
      </section>
    </main>
  )
}