'use client'

import { useCallback, useEffect, useState } from 'react'
import AddAssetForm from '@/components/AddAssetForm'
import DeleteAssetButton from '@/components/DeleteAssetButton'
import EditAssetButton from '@/components/EditAssetButton'
import { supabase } from '@/lib/supabase'

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
}
type AssetLabel = { id: string; name: string }

function eur(value: number) {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

export default function PosicionesPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [masterAssets, setMasterAssets] = useState<AssetLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

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

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <header className="mb-7">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Detalle operativo</p>
        <h1 className="text-2xl font-semibold text-white">Posiciones por broker</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Cada fila representa una tenencia en una plataforma. El activo consolidado agrupa la exposición entre plataformas.</p>
      </header>

      {errorMessage && <p role="alert" className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">No se pudieron cargar las posiciones: {errorMessage}</p>}

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
        {loading ? <p className="p-6 text-sm text-slate-400" aria-live="polite">Cargando posiciones…</p> : positions.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">Todavía no has añadido posiciones.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[1020px] text-left text-sm">
            <thead className="bg-white/[0.025] text-xs uppercase tracking-wider text-slate-400"><tr>
              <th className="px-5 py-3">Posición</th><th className="px-4 py-3">Activo consolidado</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3 text-right">Cantidad</th><th className="px-4 py-3 text-right">P. medio</th><th className="px-4 py-3 text-right">P. actual</th><th className="px-4 py-3 text-right">Valor estimado</th><th className="px-5 py-3 text-right">Acciones</th>
            </tr></thead>
            <tbody className="divide-y divide-white/[0.06]">{positions.map((position) => {
              const price = position.current_price ?? position.avg_price ?? 0
              return <tr key={position.id} className="hover:bg-white/[0.025]">
                <td className="px-5 py-4"><p className="font-medium text-slate-100">{position.name}</p><p className="mt-0.5 text-xs text-slate-500">{[position.ticker, position.broker].filter(Boolean).join(' · ') || 'Sin ticker ni broker'}</p></td>
                <td className="px-4 py-4 text-slate-300">{position.investment_asset_id ? linkedAssets.get(position.investment_asset_id) ?? 'Vínculo no encontrado' : <span className="text-amber-200">Sin vincular</span>}</td>
                <td className="px-4 py-4 text-slate-300">{position.category}</td>
                <td className="px-4 py-4 text-right tabular-nums text-slate-300">{position.quantity.toLocaleString('es-ES')}</td>
                <td className="px-4 py-4 text-right tabular-nums text-slate-300">{position.avg_price == null ? '—' : eur(position.avg_price)}</td>
                <td className="px-4 py-4 text-right tabular-nums text-slate-300">{position.current_price == null ? '—' : eur(position.current_price)}</td>
                <td className="px-4 py-4 text-right tabular-nums text-slate-100">{eur(position.quantity * price)}</td>
                <td className="px-5 py-4"><div className="flex justify-end gap-2"><EditAssetButton asset={position} /><DeleteAssetButton assetId={position.id} assetName={position.name} /></div></td>
              </tr>
            })}</tbody>
          </table></div>
        )}
      </section>
    </main>
  )
}