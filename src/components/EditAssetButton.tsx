'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { notifyPortfolioChanged } from '@/lib/portfolioEvents'
import { isCurrencyCodeSupported } from '@/lib/valuation'
import PriceReferenceFields from '@/components/PriceReferenceFields'

type Asset = {
  id: string
  name: string
  ticker: string | null
  category: string
  broker: string | null
  quantity: number | null
  avg_price: number | null
  current_price: number | null
  target_weight: number | null
  investment_asset_id?: string | null
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

type FormValues = {
  name: string
  ticker: string
  category: string
  broker: string
  quantity: string
  estimated_value_eur: string
  estimated_value_as_of: string
  avg_price: string
  current_price: string
  target_weight: string
  currency: string
  price_as_of: string
  price_source: string
  fx_rate_to_eur: string
  fx_as_of: string
  fx_source: string
}

const CATEGORIES = ['Núcleo Pasivo', 'Satélite Convicción', 'Seguridad y Liquidez', 'Activos Duros', 'Especulativo']

function toFormValues(asset: Asset): FormValues {
  return {
    name: asset.name,
    ticker: asset.ticker ?? '',
    category: asset.category,
    broker: asset.broker ?? '',
    quantity: asset.quantity == null ? '' : String(asset.quantity),
    estimated_value_eur: asset.estimated_value_eur == null ? '' : String(asset.estimated_value_eur),
    estimated_value_as_of: asset.estimated_value_as_of ?? '',
    avg_price: asset.avg_price == null ? '' : String(asset.avg_price),
    current_price: asset.current_price == null ? '' : String(asset.current_price),
    target_weight: asset.target_weight == null ? '' : String(asset.target_weight),
    currency: asset.currency ?? '',
    price_as_of: asset.price_as_of ?? '',
    price_source: asset.price_source ?? '',
    fx_rate_to_eur: asset.fx_rate_to_eur == null ? '' : String(asset.fx_rate_to_eur),
    fx_as_of: asset.fx_as_of ?? '',
    fx_source: asset.fx_source ?? '',
  }
}

function optionalNumber(value: string) {
  return value.trim() === '' ? null : Number(value)
}

function localDateInputValue() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

export default function EditAssetButton({ asset }: { asset: Asset }) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [form, setForm] = useState<FormValues>(() => toFormValues(asset))

  function openForm() {
    setForm(toFormValues(asset))
    setErrorMessage('')
    setEditing(true)
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function handlePriceReferenceChange(field: 'currency' | 'price_as_of' | 'price_source' | 'fx_rate_to_eur' | 'fx_as_of' | 'fx_source', value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      const currency = form.currency.trim().toUpperCase()
      const currentPrice = optionalNumber(form.current_price)
      const quantity = optionalNumber(form.quantity)
      const estimatedValue = optionalNumber(form.estimated_value_eur)
      if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0)) {
        setErrorMessage('La cantidad debe ser un valor válido igual o mayor que cero.')
        return
      }
      if (currentPrice !== null && quantity === null) {
        setErrorMessage('Para valorar desde un precio por unidad necesitas indicar las unidades.')
        return
      }
      if (currency === '__OTHER__' || form.price_source === '__custom__' || form.fx_source === '__custom__') {
        setErrorMessage('Completa el código de otra moneda o indica dónde consultaste el dato.')
        return
      }
      if ((currentPrice !== null || optionalNumber(form.avg_price) !== null) && !isCurrencyCodeSupported(currency)) {
        setErrorMessage('Selecciona una moneda de la lista o escribe un código reconocido.')
        return
      }
      if (currentPrice !== null && (!form.price_as_of || !form.price_source.trim() || form.price_source === '__custom__')) {
        setErrorMessage('Para el precio actual, indica también la fecha y el origen.')
        return
      }
      const fxRate = optionalNumber(form.fx_rate_to_eur)
      if (currentPrice !== null && currency !== 'EUR' && (fxRate === null || !Number.isFinite(fxRate) || fxRate <= 0 || !form.fx_as_of || !form.fx_source.trim() || form.fx_source === '__custom__')) {
        setErrorMessage('Para valorar en EUR una posición no denominada en EUR, indica tasa EUR por unidad, fecha y origen del cambio.')
        return
      }
      if (estimatedValue !== null && (!Number.isFinite(estimatedValue) || estimatedValue < 0)) {
        setErrorMessage('La estimación debe ser un importe válido igual o mayor que cero.')
        return
      }
      const estimateChanged = estimatedValue !== asset.estimated_value_eur
      const updatedValues = {
        name: form.name.trim(),
        ticker: form.ticker.trim() || null,
        broker: form.broker.trim() || null,
        quantity,
        avg_price: optionalNumber(form.avg_price),
        current_price: currentPrice,
        estimated_value_eur: currentPrice !== null ? null : estimatedValue,
        estimated_value_as_of: currentPrice !== null || estimatedValue === null
          ? null
          : estimateChanged ? localDateInputValue() : form.estimated_value_as_of || localDateInputValue(),
        target_weight: optionalNumber(form.target_weight),
        currency: isCurrencyCodeSupported(currency) ? currency : null,
        price_as_of: currentPrice !== null ? form.price_as_of : null,
        price_source: currentPrice !== null ? form.price_source.trim() : null,
        fx_rate_to_eur: currency === 'EUR' || currentPrice === null ? null : fxRate,
        fx_as_of: currency === 'EUR' || currentPrice === null ? null : form.fx_as_of,
        fx_source: currency === 'EUR' || currentPrice === null ? null : form.fx_source.trim(),
        ...(!asset.investment_asset_id ? { category: form.category } : {}),
      }
      const { data, error } = await supabase.from('assets').update(updatedValues).eq('id', asset.id).select('id').single()

      if (error || !data) {
        setErrorMessage(`No se pudo guardar el cambio: ${error?.message ?? 'no se encontró la posición actualizada'}`)
        return
      }

      setEditing(false)
      notifyPortfolioChanged()
    } catch {
      setErrorMessage('No se pudo guardar el cambio. Comprueba la conexión e inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openForm}
        aria-label={`Editar ${asset.name}`}
        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-teal-200/25 hover:bg-teal-200/10 hover:text-teal-100"
      >
        Editar
      </button>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-asset-title"
            className="my-auto grid w-full max-w-lg grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-slate-900 p-5 text-white shadow-2xl sm:grid-cols-2"
          >
            <h2 id="edit-asset-title" className="col-span-full text-lg font-bold">
              Editar posición
            </h2>

            <label className="grid gap-1 text-sm">
              Nombre
              <input name="name" value={form.name} onChange={handleChange} required className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white" />
            </label>
            <label className="grid gap-1 text-sm">
              Ticker
              <input name="ticker" value={form.ticker} onChange={handleChange} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white" />
            </label>
            {asset.investment_asset_id ? (
              <div className="grid gap-1 text-sm text-slate-300">
                Categoría estratégica
                <p className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-slate-400">{form.category} · definida por el activo consolidado</p>
              </div>
            ) : (
              <label className="grid gap-1 text-sm">
                Categoría
                <select name="category" value={form.category} onChange={handleChange} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white">
                  {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
            )}
            <label className="grid gap-1 text-sm">
              Broker
              <input name="broker" value={form.broker} onChange={handleChange} disabled={Boolean(asset.ledger_started_at)} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white disabled:opacity-60" />
            </label>
            <label className="grid gap-1 text-sm">
              Cantidad
              <input name="quantity" value={form.quantity} onChange={handleChange} type="number" min="0" step="any" readOnly={Boolean(asset.ledger_started_at)} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white read-only:opacity-60" />
            </label>
            <label className="grid gap-1 text-sm">
              Valor total estimado (€)
              <input name="estimated_value_eur" value={form.estimated_value_eur} onChange={handleChange} type="number" min="0" step="any" inputMode="decimal" className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white" />
              <span className="text-xs leading-5 text-slate-500">{form.estimated_value_as_of ? `Estimación revisada el ${form.estimated_value_as_of}.` : 'Sin fecha de referencia todavía.'}</span>
            </label>
            <details className="col-span-full rounded-xl border border-white/10 bg-black/10 p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-200">Refinar con precio, divisa y referencias</summary>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  Precio medio de compra
                  <input name="avg_price" value={form.avg_price} onChange={handleChange} type="number" min="0" step="any" readOnly={Boolean(asset.ledger_started_at)} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white read-only:opacity-60" />
                </label>
                <label className="grid gap-1 text-sm">
                  Precio actual
                  <input name="current_price" value={form.current_price} onChange={handleChange} type="number" min="0" step="any" className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white" />
                </label>
                <PriceReferenceFields
                  hasCurrentPrice={form.current_price.trim() !== ''}
                  currencyRequired={form.current_price.trim() !== '' || form.avg_price.trim() !== ''}
                  currencyLocked={Boolean(asset.ledger_started_at)}
                  currency={form.currency}
                  priceAsOf={form.price_as_of}
                  priceSource={form.price_source}
                  fxRateToEur={form.fx_rate_to_eur}
                  fxAsOf={form.fx_as_of}
                  fxSource={form.fx_source}
                  onChange={handlePriceReferenceChange}
                />
                <p className="col-span-full text-xs leading-5 text-slate-400">Una cotización completa tiene prioridad sobre la estimación. Las operaciones del ledger conservan su moneda para no alterar su historial.</p>
              </div>
            </details>
            <label className="grid gap-1 text-sm">
              Peso objetivo antiguo por posición (%)
              <input name="target_weight" value={form.target_weight} onChange={handleChange} type="number" min="0" max="100" step="any" className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white" />
            </label>

            {errorMessage && (
              <p role="alert" className="col-span-full text-sm text-red-300">{errorMessage}</p>
            )}

            <div className="col-span-full flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={loading}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-teal-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 disabled:opacity-50"
              >
                {loading ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
