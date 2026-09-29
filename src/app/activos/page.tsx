'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { notifyPortfolioChanged } from '@/lib/portfolioEvents'

type Category = 'Núcleo Pasivo' | 'Satélite Convicción' | 'Seguridad y Liquidez' | 'Activos Duros' | 'Especulativo'
type InvestmentAsset = {
  id: string
  name: string
  ticker: string | null
  market: string | null
  isin: string | null
  canonical_id: string | null
  category: Category
  target_weight: number | null
  thesis: string | null
  last_reviewed: string | null
}
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
type NewAsset = {
  name: string
  ticker: string
  market: string
  isin: string
  canonical_id: string
  category: Category
  target_weight: string
  thesis: string
  last_reviewed: string
}

const CATEGORIES: Category[] = ['Núcleo Pasivo', 'Satélite Convicción', 'Seguridad y Liquidez', 'Activos Duros', 'Especulativo']
const INITIAL_FORM: NewAsset = {
  name: '', ticker: '', market: '', isin: '', canonical_id: '', category: 'Núcleo Pasivo',
  target_weight: '', thesis: '', last_reviewed: '',
}
const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-teal-300/50 focus:outline-none'

function formatEur(value: number) {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

function positionValue(position: Position) {
  return position.quantity * (position.current_price ?? position.avg_price ?? 0)
}

function databaseMessage(message: string) {
  if (message.includes('investment_assets_category_check') || message.includes('assets_category_check')) {
    return 'La base de datos todavía no admite «Activos Duros». Ejecuta primero la migración preparada en Supabase.'
  }
  if (message.toLowerCase().includes('unique')) return 'Ya existe un activo con ese identificador. Revisa ISIN, canonical ID y ticker/mercado.'
  return message
}

export default function ActivosPage() {
  const [assets, setAssets] = useState<InvestmentAsset[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [selection, setSelection] = useState<Record<string, string>>({})
  const [form, setForm] = useState<NewAsset>(INITIAL_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [assetResult, positionResult] = await Promise.all([
        supabase.from('investment_assets').select('id,name,ticker,market,isin,canonical_id,category,target_weight,thesis,last_reviewed').order('name'),
        supabase.from('assets').select('id,name,ticker,category,broker,quantity,avg_price,current_price,target_weight,investment_asset_id').order('name').order('broker'),
      ])
      const failed = assetResult.error ?? positionResult.error
      if (failed) throw failed
      const nextAssets = (assetResult.data ?? []) as InvestmentAsset[]
      const nextPositions = (positionResult.data ?? []) as Position[]
      setAssets(nextAssets)
      setPositions(nextPositions)
      setSelection(Object.fromEntries(nextPositions.map((position) => [position.id, position.investment_asset_id ?? ''])))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? databaseMessage(error.message) : 'No se pudieron cargar activos y posiciones.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const refresh = () => window.setTimeout(() => void loadData(), 0)
    refresh()
    window.addEventListener('portfolio:changed', refresh)
    return () => window.removeEventListener('portfolio:changed', refresh)
  }, [loadData])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (form.category === 'Satélite Convicción' && assets.filter((asset) => asset.category === 'Satélite Convicción').length >= 5) {
      setErrorMessage('La política limita Satélite Convicción a cinco activos. Revisa el catálogo antes de añadir otro.')
      setSaving(false)
      return
    }

    const hasIdentity = Boolean(form.isin.trim() || form.canonical_id.trim() || (form.ticker.trim() && form.market.trim()))
    if (!hasIdentity) {
      setErrorMessage('Indica ISIN, canonical ID propio, o ticker junto con mercado. No consolidamos solo por nombre.')
      setSaving(false)
      return
    }

    const target = form.target_weight.trim() === '' ? null : Number(form.target_weight)
    if (target !== null && (!Number.isFinite(target) || target < 0 || target > 100)) {
      setErrorMessage('El peso objetivo debe estar entre 0 y 100, o quedar vacío si aún no lo has decidido.')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase.from('investment_assets').insert({
        name: form.name.trim(),
        ticker: form.ticker.trim().toUpperCase() || null,
        market: form.market.trim().toUpperCase() || null,
        isin: form.isin.trim().toUpperCase() || null,
        canonical_id: form.canonical_id.trim().toLowerCase() || null,
        category: form.category,
        target_weight: target,
        thesis: form.thesis.trim() || null,
        last_reviewed: form.last_reviewed || null,
      })
      if (error) throw error
      setForm(INITIAL_FORM)
      setSuccessMessage('Activo consolidado creado. Vincula manualmente las posiciones correspondientes debajo.')
      await loadData()
      notifyPortfolioChanged()
    } catch (error) {
      setErrorMessage(error instanceof Error ? databaseMessage(error.message) : 'No se pudo guardar el activo.')
    } finally {
      setSaving(false)
    }
  }

  async function saveTarget(asset: InvestmentAsset, rawValue: string) {
    const target = rawValue.trim() === '' ? null : Number(rawValue)
    if (target !== null && (!Number.isFinite(target) || target < 0 || target > 100)) {
      setErrorMessage('El objetivo debe estar entre 0 y 100.')
      return
    }
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const { error } = await supabase.from('investment_assets').update({ target_weight: target }).eq('id', asset.id).select('id').single()
      if (error) throw error
      setSuccessMessage(`Objetivo global de ${asset.name} actualizado.`)
      await loadData()
      notifyPortfolioChanged()
    } catch (error) {
      setErrorMessage(error instanceof Error ? databaseMessage(error.message) : 'No se pudo actualizar el objetivo.')
    } finally {
      setSaving(false)
    }
  }

  async function linkPosition(position: Position) {
    const selectedId = selection[position.id] || null
    const selectedAsset = assets.find((asset) => asset.id === selectedId)
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const update = selectedAsset
        ? { investment_asset_id: selectedAsset.id, category: selectedAsset.category }
        : { investment_asset_id: null }
      const { error } = await supabase.from('assets').update(update).eq('id', position.id).select('id').single()
      if (error) throw error
      setSuccessMessage(selectedAsset
        ? `${position.name} (${position.broker ?? 'broker no indicado'}) vinculada a ${selectedAsset.name}.`
        : `Se quitó el vínculo de ${position.name}.`)
      await loadData()
      notifyPortfolioChanged()
    } catch (error) {
      setErrorMessage(error instanceof Error ? databaseMessage(error.message) : 'No se pudo guardar el vínculo.')
    } finally {
      setSaving(false)
    }
  }

  const input = (name: keyof NewAsset, value: string) => setForm((current) => ({ ...current, [name]: value }))
  const linkedCount = positions.filter((position) => position.investment_asset_id).length

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <header className="mb-7">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Política de inversión</p>
        <h1 className="text-2xl font-semibold text-white">Activos y objetivos</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Define el objetivo una sola vez por activo. Después vincula manualmente cada posición de tus brokers; ninguna se fusiona automáticamente.</p>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-amber-200/80">Las valoraciones se interpretan como EUR: la tabla actual aún no registra divisa ni conversión. Confirma que los precios de cada posición estén convertidos a EUR antes de usar los pesos como referencia.</p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Activos consolidados</p><p className="mt-1 text-2xl font-semibold">{assets.length}</p></div>
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Posiciones vinculadas</p><p className="mt-1 text-2xl font-semibold">{linkedCount} / {positions.length}</p></div>
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Sin vincular</p><p className="mt-1 text-2xl font-semibold">{positions.length - linkedCount}</p></div>
      </div>

      {errorMessage && <p role="alert" className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{errorMessage}</p>}
      {successMessage && <p role="status" className="mb-4 rounded-xl border border-teal-300/20 bg-teal-300/[0.07] px-4 py-3 text-sm text-teal-100">{successMessage}</p>}

      <section className="mb-6 rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Añadir activo consolidado</h2>
        <p className="mb-5 mt-1 text-sm text-slate-400">Los identificadores evitan confundir instrumentos con nombres o tickers parecidos. El objetivo es global; déjalo vacío si aún no está decidido.</p>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1.5 text-sm text-slate-300">Nombre<input required value={form.name} onChange={(event) => input('name', event.target.value)} className={inputClass} placeholder="Amazon" /></label>
          <label className="grid gap-1.5 text-sm text-slate-300">Ticker<input value={form.ticker} onChange={(event) => input('ticker', event.target.value)} className={inputClass} placeholder="AMZN" /></label>
          <label className="grid gap-1.5 text-sm text-slate-300">Mercado<input value={form.market} onChange={(event) => input('market', event.target.value)} className={inputClass} placeholder="NASDAQ" /></label>
          <label className="grid gap-1.5 text-sm text-slate-300">ISIN<input value={form.isin} onChange={(event) => input('isin', event.target.value)} className={inputClass} placeholder="Opcional" /></label>
          <label className="grid gap-1.5 text-sm text-slate-300">ID canónico<input value={form.canonical_id} onChange={(event) => input('canonical_id', event.target.value)} className={inputClass} placeholder="Para oro físico, BTC, ETH u otro caso" /></label>
          <label className="grid gap-1.5 text-sm text-slate-300">Categoría estratégica<select value={form.category} onChange={(event) => input('category', event.target.value)} className={inputClass}>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm text-slate-300">Objetivo global (%)<input type="number" min="0" max="100" step="any" value={form.target_weight} onChange={(event) => input('target_weight', event.target.value)} className={inputClass} placeholder="Vacío = por definir" /></label>
          <label className="grid gap-1.5 text-sm text-slate-300">Última revisión<input type="date" value={form.last_reviewed} onChange={(event) => input('last_reviewed', event.target.value)} className={inputClass} /></label>
          <label className="grid gap-1.5 text-sm text-slate-300 sm:col-span-2 lg:col-span-3">Tesis / nota de seguimiento<textarea rows={3} value={form.thesis} onChange={(event) => input('thesis', event.target.value)} className={inputClass} placeholder="Nota privada para documentar tu criterio de inversión." /></label>
          <p className="sm:col-span-2 lg:col-span-3 text-xs leading-5 text-amber-200/80">El objetivo se guarda una sola vez para todo el activo. Las notas son de seguimiento personal; revisa su contenido y mantén también una copia privada si es importante.</p>
          <button type="submit" disabled={saving || loading} className="rounded-xl bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-200 disabled:opacity-50">{saving ? 'Guardando…' : 'Crear activo'}</button>
        </form>
      </section>

      <section className="mb-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/70">
        <div className="border-b border-white/[0.08] px-4 py-4 sm:px-6"><h2 className="font-semibold text-white">Catálogo consolidado</h2><p className="mt-1 text-sm text-slate-400">La exposición se suma desde todas las posiciones vinculadas. Los pesos antiguos por broker son solo referencia.</p></div>
        {loading ? <p className="p-6 text-sm text-slate-400">Cargando…</p> : assets.length === 0 ? <p className="p-6 text-sm text-slate-400">Aún no hay activos. Empieza creando uno; por ejemplo, un único registro de Amazon para vincular después las posiciones de ambos brokers.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm">
            <thead className="bg-white/[0.025] text-left text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3">Activo</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3 text-right">Posiciones</th><th className="px-4 py-3 text-right">Exposición</th><th className="px-4 py-3 text-right">Objetivo global</th><th className="px-4 py-3">Guardar objetivo</th></tr></thead>
            <tbody className="divide-y divide-white/[0.06]">{assets.map((asset) => {
              const linked = positions.filter((position) => position.investment_asset_id === asset.id)
              const exposure = linked.reduce((sum, position) => sum + positionValue(position), 0)
              return <AssetRow key={`${asset.id}:${asset.target_weight ?? 'null'}`} asset={asset} linkedCount={linked.length} exposure={exposure} saving={saving} onSave={saveTarget} />
            })}</tbody>
          </table></div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/70">
        <div className="border-b border-white/[0.08] px-4 py-4 sm:px-6"><h2 className="font-semibold text-white">Vincular posiciones por broker</h2><p className="mt-1 text-sm text-slate-400">Elige explícitamente a qué activo pertenece cada fila. Al guardar, la categoría estratégica de la posición pasa a coincidir con su activo maestro.</p></div>
        {loading ? <p className="p-6 text-sm text-slate-400">Cargando…</p> : positions.length === 0 ? <p className="p-6 text-sm text-slate-400">No hay posiciones registradas.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm">
            <thead className="bg-white/[0.025] text-left text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3">Posición</th><th className="px-4 py-3">Broker / categoría</th><th className="px-4 py-3 text-right">Valor registrado</th><th className="px-4 py-3 text-right">Objetivo antiguo</th><th className="px-4 py-3">Activo consolidado</th><th className="px-4 py-3">Acción</th></tr></thead>
            <tbody className="divide-y divide-white/[0.06]">{positions.map((position) => <tr key={position.id}>
              <td className="px-4 py-3"><p className="font-medium text-slate-100">{position.name}</p><p className="text-xs text-slate-500">{position.ticker ?? 'Sin ticker'}</p></td>
              <td className="px-4 py-3 text-slate-300">{position.broker ?? '—'}<p className="text-xs text-slate-500">{position.category}</p></td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-300">{formatEur(positionValue(position))}</td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-500">{position.target_weight == null ? '—' : `${position.target_weight}% · antiguo`}</td>
              <td className="px-4 py-3"><select aria-label={`Activo consolidado para ${position.name} en ${position.broker ?? 'broker sin nombre'}`} value={selection[position.id] ?? ''} onChange={(event) => setSelection((current) => ({ ...current, [position.id]: event.target.value }))} className={inputClass}><option value="">Sin vincular</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · {asset.ticker ?? asset.canonical_id ?? asset.category}</option>)}</select></td>
              <td className="px-4 py-3"><button type="button" disabled={saving || loading || (selection[position.id] ?? '') === (position.investment_asset_id ?? '')} onClick={() => void linkPosition(position)} className="rounded-lg border border-teal-300/20 px-3 py-2 text-xs font-medium text-teal-100 hover:bg-teal-300/10 disabled:cursor-not-allowed disabled:opacity-40">Guardar vínculo</button></td>
            </tr>)}</tbody>
          </table></div>
        )}
      </section>
    </main>
  )
}

function AssetRow({ asset, linkedCount, exposure, saving, onSave }: {
  asset: InvestmentAsset
  linkedCount: number
  exposure: number
  saving: boolean
  onSave: (asset: InvestmentAsset, value: string) => Promise<void>
}) {
  const [target, setTarget] = useState(asset.target_weight == null ? '' : String(asset.target_weight))
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 3)
  const reviewDate = asset.last_reviewed ? new Date(`${asset.last_reviewed}T00:00:00`) : null
  const reviewExpired = asset.category === 'Satélite Convicción' && (!reviewDate || reviewDate < cutoff)
  return (
    <tr>
      <td className="px-4 py-3"><p className="font-medium text-slate-100">{asset.name}</p><p className="text-xs text-slate-500">{[asset.ticker, asset.market, asset.isin, asset.canonical_id].filter(Boolean).join(' · ')}</p>{asset.category === 'Satélite Convicción' && <p className={`mt-1 text-xs ${reviewExpired ? 'text-amber-200' : 'text-slate-500'}`}>{reviewExpired ? 'Revisión trimestral pendiente' : `Revisado ${reviewDate?.toLocaleDateString('es-ES')}`}</p>}</td>
      <td className="px-4 py-3 text-slate-300">{asset.category}</td>
      <td className="px-4 py-3 text-right tabular-nums text-slate-300">{linkedCount}</td>
      <td className="px-4 py-3 text-right tabular-nums text-slate-300">{formatEur(exposure)}</td>
      <td className="px-4 py-3 text-right"><input aria-label={`Objetivo global de ${asset.name} en porcentaje`} type="number" min="0" max="100" step="any" value={target} onChange={(event) => setTarget(event.target.value)} className="w-28 rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-right text-slate-100" />%</td>
      <td className="px-4 py-3"><button type="button" disabled={saving || target === (asset.target_weight == null ? '' : String(asset.target_weight))} onClick={() => void onSave(asset, target)} className="rounded-lg border border-teal-300/20 px-3 py-2 text-xs font-medium text-teal-100 hover:bg-teal-300/10 disabled:cursor-not-allowed disabled:opacity-40">Guardar</button></td>
    </tr>
  )
}