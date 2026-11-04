'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { notifyPortfolioChanged } from '@/lib/portfolioEvents'
import { isCurrencyCodeSupported } from '@/lib/valuation'
import PriceReferenceFields from '@/components/PriceReferenceFields'

export default function AddAssetForm() {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [form, setForm] = useState({
    name: '', ticker: '', category: 'Núcleo Pasivo', broker: '',
    quantity: '', avg_price: '', current_price: '', target_weight: '', currency: '',
    price_as_of: '', price_source: '', fx_rate_to_eur: '', fx_as_of: '', fx_source: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }))
  }

  function handlePriceReferenceChange(field: 'currency' | 'price_as_of' | 'price_source' | 'fx_rate_to_eur' | 'fx_as_of' | 'fx_source', value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    const optionalNumeric = (value: string) => value.trim() === '' ? null : Number(value)
    if (!form.name.trim()) {
      setErrorMessage('Indica el nombre de la posición.')
      setLoading(false)
      return
    }

    const quantity = Number(form.quantity)
    if (form.quantity.trim() === '' || !Number.isFinite(quantity) || quantity < 0) {
      setErrorMessage('Introduce una cantidad válida (puede ser cero).')
      setLoading(false)
      return
    }

    const averagePrice = optionalNumeric(form.avg_price)
    const currentPrice = optionalNumeric(form.current_price)
    const targetWeight = optionalNumeric(form.target_weight)
    if ([averagePrice, currentPrice].some((value) => value !== null && (!Number.isFinite(value) || value < 0))) {
      setErrorMessage('Los precios deben ser importes válidos iguales o mayores que cero.')
      setLoading(false)
      return
    }
    if (targetWeight !== null && (!Number.isFinite(targetWeight) || targetWeight < 0 || targetWeight > 100)) {
      setErrorMessage('El peso objetivo antiguo debe estar entre 0 y 100, o quedar vacío.')
      setLoading(false)
      return
    }

    const currency = form.currency.trim().toUpperCase()
    if (currency === '__OTHER__' || form.price_source === '__custom__' || form.fx_source === '__custom__') {
      setErrorMessage('Completa el campo «Otra moneda» o escribe dónde consultaste el dato.')
      setLoading(false)
      return
    }
    if (!isCurrencyCodeSupported(currency)) {
      setErrorMessage('Indica una moneda ISO 4217 reconocida, por ejemplo EUR o USD.')
      setLoading(false)
      return
    }
    if (form.current_price.trim() !== '' && (!form.price_as_of || !form.price_source.trim() || form.price_source === '__custom__')) {
      setErrorMessage('Para el precio actual, indica también la fecha y el origen.')
      setLoading(false)
      return
    }

    const fxRate = optionalNumeric(form.fx_rate_to_eur)
    if (form.current_price.trim() && currency !== 'EUR' && (fxRate === null || !Number.isFinite(fxRate) || fxRate <= 0 || !form.fx_as_of || !form.fx_source.trim() || form.fx_source === '__custom__')) {
      setErrorMessage('Para valorar en EUR una posición no denominada en EUR, indica tasa EUR por unidad, fecha y origen del cambio.')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.from('assets').insert({
        name: form.name.trim(),
        ticker: form.ticker.trim().toUpperCase() || null,
        category: form.category,
        broker: form.broker.trim() || null,
        quantity,
        avg_price: averagePrice,
        current_price: currentPrice,
        target_weight: targetWeight,
        currency,
        price_as_of: form.current_price.trim() ? form.price_as_of : null,
        price_source: form.current_price.trim() ? form.price_source.trim() : null,
        fx_rate_to_eur: currency === 'EUR' || !form.current_price.trim() ? null : fxRate,
        fx_as_of: currency === 'EUR' || !form.current_price.trim() ? null : form.fx_as_of,
        fx_source: currency === 'EUR' || !form.current_price.trim() ? null : form.fx_source.trim(),
      })
      if (error) throw error

      setForm({ name: '', ticker: '', category: 'Núcleo Pasivo', broker: '', quantity: '', avg_price: '', current_price: '', target_weight: '', currency: '', price_as_of: '', price_source: '', fx_rate_to_eur: '', fx_as_of: '', fx_source: '' })
      setSuccessMessage('Posición añadida. Confirma su moneda y referencia de precio antes de incluirla en el patrimonio en EUR.')
      notifyPortfolioChanged()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar la posición.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:border-teal-300/50 focus:outline-none'

  return (
    <form onSubmit={handleSubmit} aria-describedby={errorMessage ? 'add-position-error' : undefined} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="grid gap-1.5 text-sm text-slate-300">Nombre de la posición
        <input name="name" value={form.name} onChange={handleChange} placeholder="p. ej. Fondo indexado global" maxLength={200} required className={inputClass} />
      </label>
      <label className="grid gap-1.5 text-sm text-slate-300">Ticker (opcional)
        <input name="ticker" value={form.ticker} onChange={handleChange} placeholder="p. ej. VWCE" maxLength={32} className={inputClass} />
      </label>
      <label className="grid gap-1.5 text-sm text-slate-300">Categoría estratégica
        <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
          <option value="Núcleo Pasivo">Núcleo Pasivo</option>
          <option value="Satélite Convicción">Satélite Convicción</option>
          <option value="Seguridad y Liquidez">Seguridad y Liquidez</option>
          <option value="Activos Duros">Activos Duros</option>
          <option value="Especulativo">Especulativo</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm text-slate-300">Broker o custodio
        <input name="broker" value={form.broker} onChange={handleChange} placeholder="p. ej. Mi banco" maxLength={120} className={inputClass} />
      </label>
      <label className="grid gap-1.5 text-sm text-slate-300">Unidades
        <input name="quantity" value={form.quantity} onChange={handleChange} type="number" min="0" step="any" required className={inputClass} />
      </label>
      <label className="grid gap-1.5 text-sm text-slate-300">Coste medio por unidad
        <input name="avg_price" value={form.avg_price} onChange={handleChange} type="number" min="0" step="any" className={inputClass} />
      </label>
      <label className="grid gap-1.5 text-sm text-slate-300">Precio actual por unidad
        <input name="current_price" value={form.current_price} onChange={handleChange} type="number" min="0" step="any" className={inputClass} />
      </label>
      <PriceReferenceFields
        hasCurrentPrice={form.current_price.trim() !== ''}
        currency={form.currency}
        priceAsOf={form.price_as_of}
        priceSource={form.price_source}
        fxRateToEur={form.fx_rate_to_eur}
        fxAsOf={form.fx_as_of}
        fxSource={form.fx_source}
        onChange={handlePriceReferenceChange}
      />
      <p className="col-span-full text-xs leading-5 text-slate-400">El coste medio y el precio actual usan la moneda indicada. El coste medio es informativo; la valoración usa el precio actual con fecha y fuente.</p>
      <label className="grid gap-1.5 text-sm text-slate-300">Objetivo heredado de esta posición (%)
        <input name="target_weight" value={form.target_weight} onChange={handleChange} type="number" min="0" max="100" step="any" aria-describedby="legacy-target-help" className={inputClass} />
        <span id="legacy-target-help" className="text-xs leading-5 text-slate-500">Dato de referencia antiguo; no sustituye al objetivo del activo consolidado.</span>
      </label>
      {errorMessage && <p id="add-position-error" role="alert" className="col-span-full text-sm text-rose-200">{errorMessage}</p>}
      {successMessage && <p role="status" aria-live="polite" className="col-span-full text-sm text-emerald-200">{successMessage}</p>}
      <button type="submit" disabled={loading} className="col-span-full rounded-xl bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 lg:col-span-1">
        {loading ? 'Guardando...' : 'Añadir posición'}
      </button>
    </form>
  )
}