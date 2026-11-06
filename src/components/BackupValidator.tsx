'use client'

import { useState } from 'react'
import { BACKUP_TABLE_NAMES, validateBackupJson, type BackupValidationResult, type BackupTableName } from '@/lib/backup'

const MAX_BACKUP_FILE_BYTES = 50 * 1024 * 1024

const TABLE_LABELS: Record<BackupTableName, string> = {
  assets: 'Posiciones',
  investment_assets: 'Activos consolidados',
  portfolio_snapshots: 'Cortes de cartera',
  portfolio_snapshot_assets: 'Detalle de cortes',
  portfolio_cash_accounts: 'Cuentas de efectivo',
  portfolio_transactions: 'Operaciones',
  real_estate_assets: 'Inmuebles',
  mortgage_liabilities: 'Hipotecas',
  wealth_snapshots: 'Cortes patrimoniales',
  portfolio_contribution_plans: 'Planes previstos',
}

export default function BackupValidator() {
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<BackupValidationResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const totalRows = result ? BACKUP_TABLE_NAMES.reduce((total, table) => total + result.counts[table], 0) : 0

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setFileName('')
    setResult(null)
    setErrorMessage('')
    if (!file) return

    if (!file.name.toLocaleLowerCase('en').endsWith('.json')) {
      setErrorMessage('Selecciona un archivo JSON de respaldo de Aureum.')
      event.target.value = ''
      return
    }
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      setErrorMessage('El archivo supera 50 MB; no se ha leído. Comprueba que sea el respaldo correcto.')
      event.target.value = ''
      return
    }

    try {
      const validation = validateBackupJson(await file.text())
      setFileName(file.name)
      setResult(validation)
    } catch (error) {
      setErrorMessage(error instanceof Error ? `No se pudo leer el archivo: ${error.message}` : 'No se pudo leer el archivo.')
      event.target.value = ''
    }
  }

  return (
    <div className="grid w-full gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4">
      <div>
        <h3 className="text-sm font-medium text-slate-100">Comprobar un archivo de respaldo</h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Se analiza en este navegador. No se envía, guarda ni restaura ningún dato.
        </p>
      </div>
      <label className="grid gap-1.5 text-xs text-slate-300">
        Archivo JSON (máximo 50 MB)
        <input
          className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-medium file:text-slate-100 hover:file:bg-white/15"
          type="file"
          accept=".json,application/json"
          onChange={(event) => void handleFileChange(event)}
        />
      </label>
      {errorMessage && <p className="text-sm text-rose-200" role="alert">{errorMessage}</p>}
      {result && (
        <div aria-live="polite" className="grid gap-3">
          <div className={result.valid ? 'text-sm text-emerald-200' : 'text-sm text-rose-200'} role={result.valid ? 'status' : 'alert'}>
            {result.valid
              ? `Estructura y referencias internas correctas: ${totalRows.toLocaleString('es-ES')} filas en 10 tablas.`
              : 'El archivo no supera la comprobación estructural.'}
            {fileName && <span className="mt-1 block break-all text-xs text-slate-400">{fileName}</span>}
            {result.exportedAt && <span className="mt-1 block text-xs text-slate-400">Exportado: {new Date(result.exportedAt).toLocaleString('es-ES')}</span>}
          </div>
          {result.errors.length > 0 && (
            <ul className="grid gap-1 text-xs text-rose-200">
              {result.errors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}
            </ul>
          )}
          {result.valid && (
            <details className="text-xs text-slate-400">
              <summary className="cursor-pointer text-slate-300">Ver filas por tabla</summary>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {BACKUP_TABLE_NAMES.map((table) => (
                  <li className="flex justify-between gap-3" key={table}>
                    <span>{TABLE_LABELS[table]}</span>
                    <span className="tabular-nums">{result.counts[table].toLocaleString('es-ES')}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <p className="text-xs leading-5 text-slate-500">
            Una comprobación correcta no demuestra que la copia incluya cambios posteriores a su fecha ni garantiza que pueda restaurarse.
          </p>
        </div>
      )}
    </div>
  )
}
