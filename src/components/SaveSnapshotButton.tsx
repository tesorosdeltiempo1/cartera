'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Props = {
  totalValue: number
  breakdown: { category: string; value: number }[]
}

export default function SaveSnapshotButton({ totalValue, breakdown }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const breakdownObj = Object.fromEntries(breakdown.map((b) => [b.category, b.value]))
    const { error } = await supabase.from('portfolio_snapshots').insert({
      total_value: totalValue,
      breakdown: breakdownObj,
    })
    setLoading(false)
    if (error) { alert('Error al guardar snapshot: ' + error.message); return }
    router.refresh()
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || totalValue === 0}
      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded font-semibold mb-6"
    >
      {loading ? 'Guardando...' : '📸 Guardar snapshot de hoy'}
    </button>
  )
}