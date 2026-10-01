'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 500

async function fetchAllRows<T>(fetchPage: (from: number, to: number) => PromiseLike<{
  data: T[] | null
  error: { message: string } | null
  count: number | null
}>): Promise<T[]> {
  const rows: T[] = []
  let expectedCount: number | null = null

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error, count } = await fetchPage(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (count !== null) {
      if (expectedCount !== null && count !== expectedCount) throw new Error('Los datos cambiaron durante la exportación. Vuelve a intentarlo.')
      expectedCount = count
    }

    const page = data ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) {
      if (expectedCount !== null && rows.length !== expectedCount) throw new Error('La exportación no recibió todas las filas; no se descargó un respaldo parcial.')
      return rows
    }
  }
}

export default function ExportBackupButton({ disabled = false }: { disabled?: boolean }) {
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    setStatus('Preparando el respaldo…')
    try {
      const [assets, investmentAssets, snapshots, snapshotAssets, cashAccounts, transactions, realEstateAssets, mortgageLiabilities, wealthSnapshots] = await Promise.all([
        fetchAllRows((from, to) => supabase.from('assets').select('*', { count: 'exact' }).order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('investment_assets').select('*', { count: 'exact' }).order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('portfolio_snapshots').select('*', { count: 'exact' }).order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('portfolio_snapshot_assets').select('*', { count: 'exact' }).order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('portfolio_cash_accounts').select('*', { count: 'exact' }).order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('portfolio_transactions').select('*', { count: 'exact' }).order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('real_estate_assets').select('*', { count: 'exact' }).order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('mortgage_liabilities').select('*', { count: 'exact' }).order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('wealth_snapshots').select('*', { count: 'exact' }).order('id').range(from, to)),
      ])
      const exportedAt = new Date()
      const backup = {
        app: 'Cartera',
        formatVersion: 6,
        exportedAt: exportedAt.toISOString(),
        tables: {
          assets,
          investment_assets: investmentAssets,
          portfolio_snapshots: snapshots,
          portfolio_snapshot_assets: snapshotAssets,
          portfolio_cash_accounts: cashAccounts,
          portfolio_transactions: transactions,
          real_estate_assets: realEstateAssets,
          mortgage_liabilities: mortgageLiabilities,
          wealth_snapshots: wealthSnapshots,
        },
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `cartera-respaldo-${exportedAt.toISOString().slice(0, 10)}.json`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStatus(`Copia generada: ${assets.length} posiciones, ${investmentAssets.length} activos, ${transactions.length} operaciones, ${realEstateAssets.length} inmuebles, ${mortgageLiabilities.length} hipotecas y ${wealthSnapshots.length} cortes patrimoniales.`)
    } catch (error) {
      setStatus(error instanceof Error ? `No se pudo generar el respaldo: ${error.message}` : 'No se pudo generar la copia. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={disabled || loading}
        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-teal-200/25 hover:bg-teal-200/10 hover:text-teal-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? 'Preparando…' : 'Descargar respaldo'}
      </button>
      <p aria-live="polite" className="text-right text-xs text-slate-400">{status || 'JSON · posiciones, activos e histórico'}</p>
    </div>
  )
}
