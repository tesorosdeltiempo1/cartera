'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { notifyPortfolioChanged } from '@/lib/portfolioEvents'

export default function AddAssetForm() {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [form, setForm] = useState({
    name: '', ticker: '', category: 'Núcleo Pasivo', broker: '',
    quantity: '', avg_price: '', current_price: '', target_weight: '',
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
      })
      if (error) throw error

      setForm({ name: '', ticker: '', category: 'Núcleo Pasivo', broker: '', quantity: '', avg_price: '', current_price: '', target_weight: '' })
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
      <input name="target_weight" value={form.target_weight} onChange={handleChange} placeholder="Peso objetivo antiguo %" aria-label="Peso objetivo antiguo de posición" type="number" min="0" max="100" step="any" className={inputClass} />
      {errorMessage && <p role="alert" className="col-span-full text-sm text-rose-200">{errorMessage}</p>}
      <button type="submit" disabled={loading} className="col-span-full rounded-xl bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 lg:col-span-1">
        {loading ? 'Guardando...' : 'Añadir posición'}
      </button>
    </form>
  )
}