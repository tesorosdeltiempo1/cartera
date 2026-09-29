'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { notifyPortfolioChanged } from '@/lib/portfolioEvents'
import type { SnapshotValuationDetail } from '@/lib/valuation'

type Props = {
  totalValue: number
  breakdown: { category: string; value: number }[]
  disabled?: boolean
  snapshotAssets: {
    investment_asset_id: string | null
    asset_name: string
    category: string
    value: number
    target_weight: number | null
    valuation_detail: SnapshotValuationDetail[]
  }[]
}

export default function SaveSnapshotButton({ totalValue, breakdown, snapshotAssets, disabled = false }: Props) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleClick() {
    setLoading(true)
    setMessage('')
    const breakdownObj = Object.fromEntries(breakdown.map((b) => [b.category, b.value]))
    try {
      const { data, error } = await supabase.from('portfolio_snapshots').insert({
        total_value: totalValue,
        breakdown: breakdownObj,
      }).select('id').single()
      if (error) throw error
      if (!data) throw new Error('No se recibió el identificador del snapshot.')

      if (snapshotAssets.length > 0) {
        const { error: detailError } = await supabase.from('portfolio_snapshot_assets').insert(
          snapshotAssets.map((asset) => ({ ...asset, snapshot_id: data.id })),
        )
        if (detailError) {
          const { error: rollbackError } = await supabase.from('portfolio_snapshots').delete().eq('id', data.id)
          if (rollbackError) {
            throw new Error(`Se guardó el total, pero no el detalle (${detailError.message}); no se pudo retirar automáticamente el registro parcial (${rollbackError.message}).`)
          }
          throw new Error(`No se guardó el detalle por activo y se retiró el snapshot incompleto: ${detailError.message}`)
        }
      }
      setMessage('Snapshot guardado.')
      notifyPortfolioChanged()
    } catch (error) {
      setMessage(error instanceof Error ? `No se pudo guardar: ${error.message}` : 'No se pudo guardar el snapshot.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        onClick={handleClick}
        disabled={loading || totalValue === 0 || disabled}
        className="rounded-xl border border-teal-200/20 bg-teal-300 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-950/20 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Guardando…' : '📸 Guardar snapshot de hoy'}
      </button>
      {message && <p role="status" aria-live="polite" className="max-w-sm text-xs text-slate-300">{message}</p>}
    </div>
  )
}