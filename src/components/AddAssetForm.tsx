'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { notifyPortfolioChanged } from '@/lib/portfolioEvents'
import { isCurrencyCodeSupported } from '@/lib/valuation'

export default function AddAssetForm() {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [form, setForm] = useState({
    name: '', ticker: '', category: 'Núcleo Pasivo', broker: '',
    quantity: '', avg_price: '', current_price: '', target_weight: '', currency: '',
    price_as_of: '', price_source: '', fx_rate_to_eur: '', fx_as_of: '', fx_source: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    const optionalNumeric = (value: string) => value.trim() === '' ? null : Number(value)
    const quantity = Number(form.quantity)
    if (form.quantity.trim() === '' || !Number.isFinite(quantity) || quantity < 0) {
      setErrorMessage('Introduce una cantidad válida (puede ser cero).')
      setLoading(false)
      return
    }

    const currency = form.currency.trim().toUpperCase()
    if (!isCurrencyCodeSupported(currency)) {
      setErrorMessage('Indica una moneda ISO 4217 reconocida, por ejemplo EUR o USD.')
      setLoading(false)
      return
    }
    if (form.current_price.trim() !== '' && (!form.price_as_of || !form.price_source.trim())) {
      setErrorMessage('Para el precio actual, indica también la fecha y el origen.')
      setLoading(false)
      return
    }

    const fxRate = optionalNumeric(form.fx_rate_to_eur)
    if (form.current_price.trim() && currency !== 'EUR' && (fxRate === null || !Number.isFinite(fxRate) || fxRate <= 0 || !form.fx_as_of || !form.fx_source.trim())) {
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
        avg_price: optionalNumeric(form.avg_price),
        current_price: optionalNumeric(form.current_price),
        target_weight: optionalNumeric(form.target_weight),
        currency,
        price_as_of: form.current_price.trim() ? form.price_as_of : null,
        price_source: form.current_price.trim() ? form.price_source.trim() : null,
        fx_rate_to_eur: currency === 'EUR' || !form.current_price.trim() ? null : fxRate,
        fx_as_of: currency === 'EUR' || !form.current_price.trim() ? null : form.fx_as_of,
        fx_source: currency === 'EUR' || !form.current_price.trim() ? null : form.fx_source.trim(),
      })
      if (error) throw error

      setForm({ name: '', ticker: '', category: 'Núcleo Pasivo', broker: '', quantity: '', avg_price: '', current_price: '', target_weight: '', currency: '', price_as_of: '', price_source: '', fx_rate_to_eur: '', fx_as_of: '', fx_source: '' })
      notifyPortfolioChanged()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar la posición.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-teal-300/50 focus:outline-none'

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input name="name" value={form.name} onChange={handleChange} placeholder="Nombre (ej. Amazon)" required aria-label="Nombre de la posición" className={inputClass} />
      <input name="ticker" value={form.ticker} onChange={handleChange} placeholder="Ticker (ej. AMZN)" aria-label="Ticker" className={inputClass} />
      <select name="category" value={form.category} onChange={handleChange} aria-label="Categoría" className={inputClass}>
        <option value="Núcleo Pasivo">Núcleo Pasivo</option>
        <option value="Satélite Convicción">Satélite Convicción</option>
        <option value="Seguridad y Liquidez">Seguridad y Liquidez</option>
        <option value="Activos Duros">Activos Duros</option>
        <option value="Especulativo">Especulativo</option>
      </select>
      <input name="broker" value={form.broker} onChange={handleChange} placeholder="Broker" aria-label="Broker" className={inputClass} />
      <input name="quantity" value={form.quantity} onChange={handleChange} placeholder="Cantidad" aria-label="Cantidad" type="number" min="0" step="any" required className={inputClass} />
      <input name="avg_price" value={form.avg_price} onChange={handleChange} placeholder="Precio medio de compra" aria-label="Precio medio de compra" type="number" min="0" step="any" className={inputClass} />
      <input name="current_price" value={form.current_price} onChange={handleChange} placeholder="Precio actual" aria-label="Precio actual" type="number" min="0" step="any" className={inputClass} />
      <label className="grid gap-1 text-xs text-slate-400">Moneda del precio · ISO 4217<input name="currency" value={form.currency} onChange={handleChange} placeholder="Escribe EUR, USD…" aria-label="Moneda ISO del precio" maxLength={3} pattern="[A-Za-z]{3}" required className={inputClass} /></label>
      {form.current_price.trim() !== '' && <>
        <label className="grid gap-1 text-xs text-slate-400">Fecha del precio<input name="price_as_of" value={form.price_as_of} onChange={handleChange} type="date" required className={inputClass} /></label>
        <input name="price_source" value={form.price_source} onChange={handleChange} placeholder="Origen del precio (p. ej. broker)" aria-label="Origen del precio" required className={inputClass} />
      </>}
      {form.currency.trim().toUpperCase() !== 'EUR' && <>
        <label className="grid gap-1 text-xs text-slate-400">EUR por 1 {form.currency.toUpperCase()}<input name="fx_rate_to_eur" value={form.fx_rate_to_eur} onChange={handleChange} placeholder="Tipo de cambio" aria-label="Euros por unidad de moneda" type="number" min="0" step="any" required className={inputClass} /></label>
        <label className="grid gap-1 text-xs text-slate-400">Fecha del cambio<input name="fx_as_of" value={form.fx_as_of} onChange={handleChange} type="date" required className={inputClass} /></label>
        <input name="fx_source" value={form.fx_source} onChange={handleChange} placeholder="Origen del cambio (p. ej. BCE)" aria-label="Origen del tipo de cambio" required className={inputClass} />
      </>}
      <p className="col-span-full text-xs leading-5 text-slate-400">El precio medio y el actual se expresan en la moneda indicada. El tipo se captura manualmente como EUR por una unidad de esa moneda; no se consulta una fuente en vivo.</p>
      <input name="target_weight" value={form.target_weight} onChange={handleChange} placeholder="Peso objetivo antiguo %" aria-label="Peso objetivo antiguo de posición" type="number" min="0" max="100" step="any" className={inputClass} />
      {errorMessage && <p role="alert" className="col-span-full text-sm text-rose-200">{errorMessage}</p>}
      <button type="submit" disabled={loading} className="col-span-full rounded-xl bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 lg:col-span-1">
        {loading ? 'Guardando...' : 'Añadir posición'}
      </button>
    </form>
  )
}