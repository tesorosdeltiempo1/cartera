'use client'

import { useMemo, useRef, useState } from 'react'
import {
  parsePositionCsv,
  parsePositionImportNumber,
  preparePositionImport,
  POSITION_IMPORT_TEMPLATE,
  type PositionImportExisting,
  type PositionImportNumberFormat,
  type PositionImportPreviewRow,
} from '@/lib/positionImport'
import { notifyPortfolioChanged } from '@/lib/portfolioEvents'
import { supabase } from '@/lib/supabase'

type ImportReport = {
  formatVersion: 1
  importedAt: string
  sourceFile: string
  sourceDescription: string
  statementDate: string
  numberFormat: PositionImportNumberFormat
  sourceSha256: string
  actions: {
    line: number
    status: 'new' | 'update'
    positionId: string | null
    applied: boolean
    message: string
    previous: PositionImportExisting | null
    values: Record<string, string | number | null>
  }[]
  failure: { line: number; message: string } | null
  notRunLines: number[]
}

const MAX_FILE_BYTES = 2 * 1024 * 1024
const FIELD_LABELS: Record<string, string> = {
  name: 'nombre',
  ticker: 'ticker',
  broker: 'broker',
  category: 'categoría',
  quantity: 'unidades',
  avg_price: 'coste medio',
  current_price: 'precio actual',
  currency: 'moneda',
  price_as_of: 'fecha del precio',
  price_source: 'fuente del precio',
  fx_rate_to_eur: 'EUR por unidad',
  fx_as_of: 'fecha del cambio',
  fx_source: 'fuente del cambio',
  estimated_value_eur: 'estimación EUR',
}
const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-300/50 focus:outline-none'

function localDateInputValue() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

function formatEur(value: number) {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

function statusLabel(status: PositionImportPreviewRow['status']) {
  return {
    new: 'Nueva',
    update: 'Cambio',
    unchanged: 'Sin cambios',
    invalid: 'Revisar',
    ambiguous: 'Ambigua',
    ledger_locked: 'Ledger activo',
  }[status]
}

function statusClass(status: PositionImportPreviewRow['status']) {
  if (status === 'new') return 'text-cyan-200'
  if (status === 'update') return 'text-amber-200'
  if (status === 'unchanged') return 'text-emerald-200'
  return 'text-rose-200'
}

function summarizeMutation(row: PositionImportPreviewRow) {
  const mutation = row.mutation
  if (!mutation) return row.message
  if (mutation.status === 'new') return 'Crear posición nueva sin vínculo consolidado ni objetivo heredado.'
  const changes = Object.entries(mutation.patch ?? {}).map(([key, value]) => `${FIELD_LABELS[key] ?? key}: ${String(mutation.current?.[key as keyof PositionImportExisting] ?? '—')} → ${value === null ? 'vacío' : String(value)}`)
  return changes.join(' · ')
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function PositionImportPanel({
  positions,
  onApplied,
}: {
  positions: PositionImportExisting[]
  onApplied: () => Promise<void>
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [sourceSha256, setSourceSha256] = useState('')
  const [statementDate, setStatementDate] = useState('')
  const [sourceDescription, setSourceDescription] = useState('')
  const [numberFormat, setNumberFormat] = useState<PositionImportNumberFormat>('es')
  const [controlTotal, setControlTotal] = useState('')
  const [preview, setPreview] = useState<PositionImportPreviewRow[]>([])
  const [includedLines, setIncludedLines] = useState<Set<number>>(new Set())
  const [confirmOldData, setConfirmOldData] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loadingFile, setLoadingFile] = useState(false)
  const [applying, setApplying] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [runReport, setRunReport] = useState<ImportReport | null>(null)

  const today = localDateInputValue()
  const selectedRows = preview.filter((row) => row.mutation && includedLines.has(row.line))
  const hasOldData = statementDate !== '' && statementDate < today && selectedRows.length > 0
  const availableRows = preview.filter((row) => row.status === 'new' || row.status === 'update')
  const reconcilableRows = preview.filter((row) => ['new', 'update', 'unchanged'].includes(row.status))
  const valuedRows = reconcilableRows.filter((row) => row.valueEur !== null)
  const estimatedRows = reconcilableRows.filter((row) => row.quality === 'estimated').length
  const importedTotal = valuedRows.reduce((total, row) => total + (row.valueEur ?? 0), 0)
  const allRowsValued = preview.length > 0 && reconcilableRows.length === preview.length && valuedRows.length === preview.length
  const parsedControlTotal = useMemo(() => {
    if (!controlTotal.trim()) return null
    try {
      return parsePositionImportNumber(controlTotal, numberFormat, 'total de control')
    } catch {
      return null
    }
  }, [controlTotal, numberFormat])
  const controlTotalError = controlTotal.trim() !== '' && parsedControlTotal === null
  const controlDelta = parsedControlTotal === null ? null : importedTotal - parsedControlTotal
  const oldDataConfirmed = !hasOldData || confirmOldData
  const canApply = selectedRows.length > 0 && oldDataConfirmed && !applying && !runReport

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setErrorMessage('')
    setStatusMessage('')
    setPreview([])
    setIncludedLines(new Set())
    setRunReport(null)
    setSourceSha256('')
    setConfirmOldData(false)
    if (!file) return
    if (!file.name.toLocaleLowerCase('en').endsWith('.csv')) {
      setErrorMessage('Selecciona un archivo CSV. Convierte Excel a CSV UTF-8 y adapta sus columnas a la plantilla de Aureum.')
      event.target.value = ''
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setErrorMessage('El archivo supera 2 MB. Exporta solo las posiciones necesarias.')
      event.target.value = ''
      return
    }

    setLoadingFile(true)
    try {
      const text = await file.text()
      parsePositionCsv(text)
      setFileName(file.name)
      setStatusMessage(`Archivo leído localmente: ${file.name}. No se ha enviado ni guardado en un servidor.`)
    } catch (error) {
      setFileName('')
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo leer el CSV.')
      event.target.value = ''
    } finally {
      setLoadingFile(false)
    }
  }

  async function buildPreview() {
    setErrorMessage('')
    setStatusMessage('')
    setRunReport(null)
    setPreview([])
    setIncludedLines(new Set())
    setConfirmOldData(false)
    if (!fileInput.current?.files?.[0]) {
      setErrorMessage('Selecciona primero el CSV que quieras revisar.')
      return
    }
    if (!statementDate || statementDate > today) {
      setErrorMessage('Indica una fecha de corte válida que no esté en el futuro.')
      return
    }
    if (!sourceDescription.trim()) {
      setErrorMessage('Describe el documento de origen (broker, extracto o captura).')
      return
    }
    if (sourceDescription.trim().length > 200) {
      setErrorMessage('La descripción de la fuente no puede superar 200 caracteres.')
      return
    }
    if (controlTotalError) {
      setErrorMessage('El total de control no sigue el formato numérico seleccionado.')
      return
    }

    setLoadingFile(true)
    try {
      const file = fileInput.current.files[0]
      const text = await file.text()
      const parsed = parsePositionCsv(text)
      const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
      const fingerprint = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
      const nextPreview = preparePositionImport(parsed, positions, statementDate, today, numberFormat)
      setPreview(nextPreview)
      setSourceSha256(fingerprint)
      setIncludedLines(new Set(nextPreview
        .filter((row) => row.mutation !== null)
        .map((row) => row.line)))
      setStatusMessage(`Vista previa preparada: ${parsed.length} fila(s), ${nextPreview.filter((row) => row.status === 'new').length} nuevas, ${nextPreview.filter((row) => row.status === 'update').length} con cambios, ${nextPreview.filter((row) => row.status === 'unchanged').length} sin cambios.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo preparar la vista previa.')
    } finally {
      setLoadingFile(false)
    }
  }

  function toggleLine(line: number) {
    setIncludedLines((current) => {
      const next = new Set(current)
      if (next.has(line)) next.delete(line)
      else next.add(line)
      return next
    })
  }

  function toggleAll(include: boolean) {
    setIncludedLines(include
      ? new Set(availableRows.map((row) => row.line))
      : new Set())
  }

  async function applyImport() {
    if (!canApply) return
    setApplying(true)
    setConfirmOpen(false)
    setErrorMessage('')
    setStatusMessage('')

    const actions: ImportReport['actions'] = []
    let failure: ImportReport['failure'] = null
    for (const row of selectedRows) {
      const mutation = row.mutation!
      try {
        if (mutation.status === 'new') {
          const { data, error } = await supabase
            .from('assets')
            .insert(mutation.insert!)
            .select('id')
            .single()
          if (error) throw new Error(error.message)
          actions.push({
            line: row.line,
            status: 'new',
            positionId: data.id,
            applied: true,
            message: 'Posición creada.',
            previous: null,
            values: mutation.insert!,
          })
        } else {
          const current = mutation.current!
          let query = supabase.from('assets').update(mutation.patch!).eq('id', current.id)
          const concurrencyFields: (keyof PositionImportExisting)[] = [
            'name', 'broker', 'ticker', 'quantity', 'avg_price', 'current_price', 'currency',
            'price_as_of', 'price_source', 'fx_rate_to_eur', 'fx_as_of', 'fx_source',
            'category', 'investment_asset_id', 'ledger_started_at',
          ]
          for (const key of concurrencyFields) {
            const value = current[key]
            query = value === null
              ? query.is(key, null)
              : query.eq(key, value)
          }
          const { data, error } = await query.select('id').maybeSingle()
          if (error) throw new Error(error.message)
          if (!data) throw new Error('La posición cambió después de la vista previa o ya no existe. No se sobrescribió.')
          actions.push({
            line: row.line,
            status: 'update',
            positionId: current.id,
            applied: true,
            message: 'Cambios aplicados.',
            previous: current,
            values: mutation.patch!,
          })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido al guardar la fila.'
        actions.push({
          line: row.line,
          status: mutation.status,
          positionId: mutation.current?.id ?? null,
          applied: false,
          message,
          previous: mutation.current,
          values: mutation.insert ?? mutation.patch ?? {},
        })
        failure = { line: row.line, message }
        break
      }
    }

    const report: ImportReport = {
      formatVersion: 1,
      importedAt: new Date().toISOString(),
      sourceFile: fileName,
      sourceDescription: sourceDescription.trim(),
      statementDate,
      numberFormat,
      sourceSha256,
      actions,
      failure,
      notRunLines: failure
        ? selectedRows.slice(actions.length).map((row) => row.line)
        : [],
    }
    setRunReport(report)
    const successCount = actions.filter((action) => action.applied).length
    if (successCount > 0) {
      notifyPortfolioChanged()
      await onApplied()
    }
    if (failure) {
      setErrorMessage(`Importación parcial: ${successCount} fila(s) guardadas. Se detuvo en la fila ${failure.line}: ${failure.message}. Descarga el acta y vuelve a generar la vista previa antes de reintentar.`)
    } else {
      setStatusMessage(`Importación completada: ${successCount} fila(s) guardadas. Descarga el acta privada para conservar el detalle.`)
    }
    setApplying(false)
  }

  function downloadReport() {
    if (!runReport) return
    const date = runReport.importedAt.slice(0, 10)
    downloadText(
      `aureum-acta-importacion-${date}.json`,
      JSON.stringify(runReport, null, 2),
      'application/json;charset=utf-8',
    )
  }

  function resetImport() {
    setFileName('')
    setSourceSha256('')
    setStatementDate('')
    setSourceDescription('')
    setControlTotal('')
    setPreview([])
    setIncludedLines(new Set())
    setConfirmOldData(false)
    setRunReport(null)
    setStatusMessage('')
    setErrorMessage('')
    if (fileInput.current) fileInput.current.value = ''
  }

  const oldDataNeedsConfirmation = hasOldData && !confirmOldData

  return (
    <section className="mb-6 rounded-2xl border border-teal-200/15 bg-slate-900/70 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Importar posiciones con revisión</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            Prepara un CSV común desde los extractos originales. Se analiza en este navegador; no se sube el archivo. Nada cambia hasta que revises y confirmes las filas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadText('aureum-plantilla-posiciones.csv', `\uFEFF${POSITION_IMPORT_TEMPLATE}`, 'text/csv;charset=utf-8')}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-teal-100 transition hover:bg-white/[0.05]"
        >
          Descargar plantilla CSV
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1.5 text-sm text-slate-300 sm:col-span-2">
          Archivo CSV (máximo 2 MB, hasta 500 filas)
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void handleFileChange(event)}
            disabled={loadingFile || applying || Boolean(runReport)}
            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:text-white"
          />
        </label>
        <label className="grid gap-1.5 text-sm text-slate-300">
          Fecha de corte del extracto
          <input type="date" value={statementDate} max={today} onChange={(event) => setStatementDate(event.target.value)} className={inputClass} disabled={Boolean(runReport) || preview.length > 0} />
        </label>
        <label className="grid gap-1.5 text-sm text-slate-300">
          Formato numérico del archivo
          <select value={numberFormat} onChange={(event) => setNumberFormat(event.target.value as PositionImportNumberFormat)} className={inputClass} disabled={Boolean(runReport) || preview.length > 0}>
            <option value="es">Español: coma decimal (1.234,56)</option>
            <option value="en">Internacional: punto decimal (1234.56)</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm text-slate-300 sm:col-span-2">
          Fuente del archivo
          <input
            type="text"
            value={sourceDescription}
            onChange={(event) => setSourceDescription(event.target.value)}
            maxLength={200}
            placeholder="p. ej. Extracto de Trade Republic, descargado el 05-nov-2026"
            className={inputClass}
            disabled={Boolean(runReport) || preview.length > 0}
          />
        </label>
        <label className="grid gap-1.5 text-sm text-slate-300 sm:col-span-2">
          Total de control del extracto (€), opcional
          <input
            type="text"
            inputMode="decimal"
            value={controlTotal}
            onChange={(event) => setControlTotal(event.target.value)}
            placeholder={numberFormat === 'es' ? 'p. ej. 1.234,56' : 'e.g. 1234.56'}
            className={inputClass}
            disabled={Boolean(runReport) || preview.length > 0}
          />
          <span className="text-xs leading-5 text-slate-500">Úsalo solo si el importe corresponde a las mismas posiciones del archivo y excluye efectivo.</span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void buildPreview()} disabled={!fileName || loadingFile || Boolean(runReport)} className="rounded-xl bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50">
          {loadingFile ? 'Leyendo…' : 'Preparar vista previa'}
        </button>
        {fileName && <span className="text-xs text-slate-400">Archivo local: {fileName}</span>}
      </div>

      <div className="mt-4 grid gap-2 text-xs leading-5 text-slate-400 sm:grid-cols-2">
        <p>La identidad de coincidencia es broker + ticker; si no hay ticker, broker + nombre. Las coincidencias múltiples se bloquean.</p>
        <p>Campos opcionales vacíos conservan el valor actual; usa <code className="text-teal-100">__CLEAR__</code> para borrar. Fecha/fuente y FX/fecha/fuente se borran como grupos completos. Ninguna fila ausente se elimina.</p>
        <p>El precio requiere fecha y fuente. El tipo de cambio se expresa en EUR por unidad; si falta, la valoración queda pendiente y no se suma en EUR.</p>
        <p>Posiciones con ledger activo no pueden cambiar cantidad, coste medio, moneda o broker por importación. Los vínculos, objetivos, operaciones y cortes históricos no se reescriben.</p>
      </div>

      {statementDate && statementDate < today && !runReport && (
        <p className="mt-4 rounded-xl border border-amber-200/20 bg-amber-200/[0.06] p-3 text-sm leading-6 text-amber-100">
          El corte es anterior a hoy. Si aplicas esta importación, actualizará las posiciones vigentes con datos de esa fecha; los precios pueden quedar obsoletos.
        </p>
      )}

      {preview.length > 0 && !runReport && (
        <div className="mt-5">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3"><p className="text-xs text-slate-500">Filas del archivo</p><p className="mt-1 text-lg font-semibold text-white">{preview.length}</p></div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3"><p className="text-xs text-slate-500">Nuevas / cambios</p><p className="mt-1 text-lg font-semibold text-white">{preview.filter((row) => row.status === 'new' || row.status === 'update').length}</p></div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3"><p className="text-xs text-slate-500">Sin cambios / bloqueadas</p><p className="mt-1 text-lg font-semibold text-white">{preview.filter((row) => row.status === 'unchanged').length} / {preview.filter((row) => row.mutation === null && row.status !== 'unchanged').length}</p></div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3"><p className="text-xs text-slate-500">Importe identificado del archivo</p><p className="mt-1 text-lg font-semibold text-white">{formatEur(importedTotal)}</p><p className="mt-1 text-xs text-slate-500">{valuedRows.length} de {preview.length} filas; puede combinar valoraciones detalladas y estimaciones.</p></div>
          </div>
          <p className="mt-2 break-all text-xs text-slate-500">Huella SHA-256 del archivo: {sourceSha256}</p>

          {controlDelta !== null && (
            <p className={`mt-3 rounded-xl border p-3 text-sm leading-6 ${allRowsValued && Math.abs(controlDelta) < 0.01 ? 'border-emerald-200/20 bg-emerald-200/[0.05] text-emerald-100' : 'border-amber-200/20 bg-amber-200/[0.05] text-amber-100'}`}>
              {allRowsValued
                ? `Diferencia frente al total de control: ${formatEur(controlDelta)}. ${Math.abs(controlDelta) < 0.01 ? estimatedRows > 0 ? `La suma coincide, pero incluye ${estimatedRows} estimación(es) y no verifica su precisión.` : 'El total coincide.' : 'Revisa fecha, unidades, precios, efectivo incluido y posiciones del extracto.'}`
                : `Conciliación incompleta: ${formatEur(importedTotal)} suma solo ${valuedRows.length} filas valorables y no bloqueadas; no equivale todavía al total de control.`}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2 text-xs">
              <button type="button" onClick={() => toggleAll(true)} className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/5">Incluir nuevas y cambios</button>
              <button type="button" onClick={() => toggleAll(false)} className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/5">Excluir todas</button>
              <span className="self-center text-slate-400">{selectedRows.length} fila(s) seleccionadas para aplicar</span>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="px-3 py-3">Aplicar</th><th className="px-3 py-3">Fila</th><th className="px-3 py-3">Posición / broker</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3 text-right">Importe EUR</th><th className="px-3 py-3">Resultado de revisión</th></tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {preview.map((row) => (
                  <tr key={row.line} className="align-top hover:bg-white/[0.025]">
                    <td className="px-3 py-3">
                      {row.mutation && <input type="checkbox" checked={includedLines.has(row.line)} onChange={() => toggleLine(row.line)} aria-label={`Aplicar fila ${row.line}: ${row.name}`} className="size-4 accent-teal-300" />}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-slate-400">{row.line}</td>
                    <td className="px-3 py-3"><p className="font-medium text-slate-100">{row.name || 'Sin nombre'}</p><p className="text-xs text-slate-500">{[row.ticker, row.broker].filter(Boolean).join(' · ') || 'Sin ticker ni broker'}</p></td>
                    <td className={`px-3 py-3 font-medium ${statusClass(row.status)}`}>{statusLabel(row.status)}{row.quality === 'confirmed' ? ' · con referencias' : row.quality === 'estimated' ? ' · estimada' : ' · sin importe'}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-200">{row.valueEur === null ? '—' : formatEur(row.valueEur)}</td>
                    <td className="max-w-xl px-3 py-3 text-xs leading-5 text-slate-400"><p>{summarizeMutation(row)}</p>{row.mutation && <p className="mt-1 text-slate-500">{row.message}</p>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasOldData && (
            <label className="mt-4 flex items-start gap-2 text-sm leading-6 text-amber-100">
              <input type="checkbox" checked={confirmOldData} onChange={(event) => setConfirmOldData(event.target.checked)} className="mt-1 size-4 accent-amber-300" />
              Confirmo que quiero aplicar datos con fecha de corte {statementDate} sobre las posiciones actuales.
            </label>
          )}

          {controlTotal !== '' && allRowsValued && controlDelta !== null && Math.abs(controlDelta) >= 0.01 && (
            <p className="mt-3 text-sm leading-6 text-amber-100">La diferencia de control no impide continuar, pero la importación seguirá señalada como no conciliada. No fuerces datos para hacer coincidir el total.</p>
          )}
          {oldDataNeedsConfirmation && <p className="mt-2 text-xs text-amber-200">Marca la confirmación de fecha antigua para habilitar la aplicación.</p>}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setConfirmOpen(true)} disabled={!canApply} className="rounded-xl bg-amber-200 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50">
              Revisar y confirmar {selectedRows.length} cambio(s)
            </button>
          </div>
        </div>
      )}

      {runReport && (
        <div className="mt-4 rounded-xl border border-emerald-200/20 bg-emerald-200/[0.05] p-4">
          <p className="font-medium text-emerald-100">Acta de importación lista</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            {runReport.actions.filter((action) => action.applied).length} cambios aplicados
            {runReport.failure ? `; ejecución detenida en fila ${runReport.failure.line}; ${runReport.notRunLines.length} fila(s) quedaron sin ejecutar` : ''}. El acta JSON conserva fuente, fecha, hash del archivo, cambios y resultado localmente; guárdala en privado.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={downloadReport} className="rounded-xl bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-200">Descargar acta privada</button>
            <button type="button" onClick={resetImport} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5">Importar otro archivo</button>
          </div>
        </div>
      )}

      {errorMessage && <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-3 text-sm leading-6 text-rose-100">{errorMessage}</p>}
      {statusMessage && <p role="status" aria-live="polite" className="mt-4 text-sm leading-6 text-teal-100">{statusMessage}</p>}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <section role="alertdialog" aria-modal="true" aria-labelledby="position-import-confirm-title" className="my-auto w-full max-w-lg rounded-2xl border border-amber-200/20 bg-slate-900 p-5 text-white shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Confirmación de cambios</p>
            <h2 id="position-import-confirm-title" className="mt-2 text-xl font-semibold">¿Aplicar la vista previa?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Se procesarán {selectedRows.length} filas: {selectedRows.filter((row) => row.mutation?.status === 'new').length} altas y {selectedRows.filter((row) => row.mutation?.status === 'update').length} actualizaciones.
              {hasOldData ? ` La fuente es del ${statementDate}; los precios pueden quedar desactualizados.` : ''}
              {' '}Las operaciones son secuenciales; si una falla, se detendrá el resto y el acta indicará qué se aplicó.
            </p>
            <p className="mt-3 rounded-lg border border-white/10 bg-slate-950/50 p-3 text-xs leading-5 text-slate-400">
              No se borrarán posiciones ausentes del archivo ni se tocarán vínculos, objetivos, ledger, snapshots o inmuebles. No existe una transacción atómica para varias filas.
            </p>
            <div className="mt-5 flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={applying} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05]">Volver a revisar</button>
              <button type="button" onClick={() => void applyImport()} disabled={!canApply} className="rounded-xl bg-amber-200 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-100 disabled:opacity-50">{applying ? 'Aplicando…' : 'Confirmar importación'}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
