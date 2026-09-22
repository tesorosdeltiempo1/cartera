'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AddAssetForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', ticker: '', category: 'Satélite', broker: '',
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

    setForm({ name: '', ticker: '', category: 'Satélite', broker: '', quantity: '', avg_price: '', current_price: '', target_weight: '' })
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 bg-gray-800 p-4 rounded-lg mb-6 text-white">
      <input name="name" value={form.name} onChange={handleChange} placeholder="Nombre (ej. Amazon)" required className="p-2 rounded text-black" />
      <input name="ticker" value={form.ticker} onChange={handleChange} placeholder="Ticker (ej. AMZN)" className="p-2 rounded text-black" />
      <select name="category" value={form.category} onChange={handleChange} className="p-2 rounded text-black">
        <option value="Núcleo">Núcleo</option>
        <option value="Satélite">Satélite</option>
        <option value="Activos Duros">Activos Duros</option>
      </select>
      <input name="broker" value={form.broker} onChange={handleChange} placeholder="Broker" className="p-2 rounded text-black" />
      <input name="quantity" value={form.quantity} onChange={handleChange} placeholder="Cantidad" type="number" step="any" className="p-2 rounded text-black" />
      <input name="avg_price" value={form.avg_price} onChange={handleChange} placeholder="Precio medio compra" type="number" step="any" className="p-2 rounded text-black" />
      <input name="current_price" value={form.current_price} onChange={handleChange} placeholder="Precio actual" type="number" step="any" className="p-2 rounded text-black" />
      <input name="target_weight" value={form.target_weight} onChange={handleChange} placeholder="Peso objetivo %" type="number" step="any" className="p-2 rounded text-black" />
      <button type="submit" disabled={loading} className="col-span-2 bg-blue-600 hover:bg-blue-700 p-2 rounded font-semibold">
        {loading ? 'Guardando...' : 'Añadir posición'}
      </button>
    </form>
  )
}