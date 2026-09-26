'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AddAssetForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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

    const { error } = await supabase.from('assets').insert({
      name: form.name,
      ticker: form.ticker || null,
      category: form.category,
      broker: form.broker || null,
      quantity: Number(form.quantity) || 0,
      avg_price: form.avg_price ? Number(form.avg_price) : null,
      current_price: form.current_price ? Number(form.current_price) : null,
      target_weight: form.target_weight ? Number(form.target_weight) : null,
    })

    setLoading(false)
    if (error) { alert('Error al guardar: ' + error.message); return }

    setForm({ name: '', ticker: '', category: 'Núcleo Pasivo', broker: '', quantity: '', avg_price: '', current_price: '', target_weight: '' })
    router.refresh()
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
        <option value="Especulativo">Especulativo</option>
      </select>
      <input name="broker" value={form.broker} onChange={handleChange} placeholder="Broker" aria-label="Broker" className={inputClass} />
      <input name="quantity" value={form.quantity} onChange={handleChange} placeholder="Cantidad" aria-label="Cantidad" type="number" step="any" className={inputClass} />
      <input name="avg_price" value={form.avg_price} onChange={handleChange} placeholder="Precio medio de compra" aria-label="Precio medio de compra" type="number" step="any" className={inputClass} />
      <input name="current_price" value={form.current_price} onChange={handleChange} placeholder="Precio actual" aria-label="Precio actual" type="number" step="any" className={inputClass} />
      <input name="target_weight" value={form.target_weight} onChange={handleChange} placeholder="Peso objetivo %" aria-label="Peso objetivo en porcentaje" type="number" step="any" className={inputClass} />
      <button type="submit" disabled={loading} className="col-span-full rounded-xl bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 lg:col-span-1">
        {loading ? 'Guardando...' : 'Añadir posición'}
      </button>
    </form>
  )
}