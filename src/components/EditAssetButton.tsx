'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Asset = {
  id: string
  name: string
  ticker: string | null
  category: string
  broker: string | null
  quantity: number
  avg_price: number | null
  current_price: number | null
  target_weight: number | null
}

type FormValues = {
  name: string
  ticker: string
  category: string
  broker: string
  quantity: string
  avg_price: string
  current_price: string
  target_weight: string
}

const CATEGORIES = ['Núcleo Pasivo', 'Satélite Convicción', 'Seguridad y Liquidez', 'Especulativo']

function toFormValues(asset: Asset): FormValues {
  return {
    name: asset.name,
    ticker: asset.ticker ?? '',
    category: asset.category,
    broker: asset.broker ?? '',
    quantity: String(asset.quantity),
    avg_price: asset.avg_price == null ? '' : String(asset.avg_price),
    current_price: asset.current_price == null ? '' : String(asset.current_price),
    target_weight: asset.target_weight == null ? '' : String(asset.target_weight),
  }
}

function optionalNumber(value: string) {
  return value.trim() === '' ? null : Number(value)
}

export default function EditAssetButton({ asset }: { asset: Asset }) {
  const router = useRouter()
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      const { data, error } = await supabase.from('assets').update({
        name: form.name.trim(),
        ticker: form.ticker.trim() || null,
        category: form.category,
        broker: form.broker.trim() || null,
        quantity: Number(form.quantity),
        avg_price: optionalNumber(form.avg_price),
        current_price: optionalNumber(form.current_price),
        target_weight: optionalNumber(form.target_weight),
      }).eq('id', asset.id).select('id').single()

      if (error || !data) {
        setErrorMessage(`No se pudo guardar el cambio: ${error?.message ?? 'no se encontró la posición actualizada'}`)
        return
      }

      setEditing(false)
      router.refresh()
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
        className="rounded border border-gray-600 px-3 py-1 text-sm hover:bg-gray-700"
      >
        Editar
      </button>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
          <form
            onSubmit={handleSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-asset-title"
            className="my-auto grid w-full max-w-lg grid-cols-1 gap-3 rounded-lg bg-gray-900 p-5 text-white shadow-xl sm:grid-cols-2"
          >
            <h2 id="edit-asset-title" className="col-span-full text-lg font-bold">
              Editar posición
            </h2>

            <label className="grid gap-1 text-sm">
              Nombre
              <input name="name" value={form.name} onChange={handleChange} required className="rounded p-2 text-black" />
            </label>
            <label className="grid gap-1 text-sm">
              Ticker
              <input name="ticker" value={form.ticker} onChange={handleChange} className="rounded p-2 text-black" />
            </label>
            <label className="grid gap-1 text-sm">
              Categoría
              <select name="category" value={form.category} onChange={handleChange} className="rounded p-2 text-black">
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Broker
              <input name="broker" value={form.broker} onChange={handleChange} className="rounded p-2 text-black" />
            </label>
            <label className="grid gap-1 text-sm">
              Cantidad
              <input name="quantity" value={form.quantity} onChange={handleChange} type="number" min="0" step="any" required className="rounded p-2 text-black" />
            </label>
            <label className="grid gap-1 text-sm">
              Precio medio de compra
              <input name="avg_price" value={form.avg_price} onChange={handleChange} type="number" min="0" step="any" className="rounded p-2 text-black" />
            </label>
            <label className="grid gap-1 text-sm">
              Precio actual
              <input name="current_price" value={form.current_price} onChange={handleChange} type="number" min="0" step="any" className="rounded p-2 text-black" />
            </label>
            <label className="grid gap-1 text-sm">
              Peso objetivo (%)
              <input name="target_weight" value={form.target_weight} onChange={handleChange} type="number" min="0" step="any" className="rounded p-2 text-black" />
            </label>

            {errorMessage && (
              <p role="alert" className="col-span-full text-sm text-red-300">{errorMessage}</p>
            )}

            <div className="col-span-full flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={loading}
                className="rounded border border-gray-600 px-4 py-2 hover:bg-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-50"
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
