'use client'

import { useState } from 'react'

type BackupRecord = Record<string, unknown>

type Props = {
  assets: BackupRecord[]
  snapshots: BackupRecord[]
  disabled?: boolean
}

export default function ExportBackupButton({ assets, snapshots, disabled = false }: Props) {
  const [status, setStatus] = useState('')

  function handleExport() {
    try {
      const exportedAt = new Date()
      const backup = {
        app: 'Cartera',
        formatVersion: 1,
        exportedAt: exportedAt.toISOString(),
        tables: {
          assets,
          portfolio_snapshots: snapshots,
        },
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `cartera-respaldo-${exportedAt.toISOString().slice(0, 10)}.json`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStatus(`Copia generada: ${assets.length} posiciones y ${snapshots.length} snapshots.`)
    } catch {
      setStatus('No se pudo generar la copia. Inténtalo de nuevo.')
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={disabled}
        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-teal-200/25 hover:bg-teal-200/10 hover:text-teal-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Descargar respaldo
      </button>
      <p aria-live="polite" className="text-right text-xs text-slate-400">{status || 'JSON · incluye posiciones e histórico'}</p>
    </div>
  )
}
