'use client'

import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { notifyPortfolioChanged } from '@/lib/portfolioEvents'
import { COMMON_CURRENCIES } from '@/lib/currencies'
import { isCurrencyCodeSupported } from '@/lib/valuation'
import type { LedgerPosition } from '@/lib/ledger'

type OperationType = 'buy' | 'sell' | 'opening_cash' | 'deposit' | 'withdrawal' | 'dividend' | 'interest' | 'fee' | 'transfer_in' | 'transfer_out' | 'fx_update'
type Props = { positions: LedgerPosition[]; trackedPositionIds: Set<string>; currencies: string[] }

const OPERATION_OPTIONS: { value: OperationType; label: string; group: 'position' | 'cash' }[] = [
  { value: 'buy', label: 'Compra de activo', group: 'position' },
  { value: 'sell', label: 'Venta de activo', group: 'position' },
  { value: 'opening_cash', label: 'Saldo inicial de efectivo', group: 'cash' },
  { value: 'deposit', label: 'Ingreso de efectivo', group: 'cash' },
  { value: 'withdrawal', label: 'Retirada de efectivo', group: 'cash' },
  { value: 'dividend', label: 'Dividendo', group: 'cash' },
  { value: 'interest', label: 'Interés', group: 'cash' },
  { value: 'fee', label: 'Comisión', group: 'cash' },
  { value: 'transfer_in', label: 'Traspaso recibido', group: 'cash' },
  { value: 'transfer_out', label: 'Traspaso enviado', group: 'cash' },
  { value: 'fx_update', label: 'Actualizar cambio de la cuenta', group: 'cash' },
]

const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100'
const labelClass = 'grid gap-1.5 text-sm text-slate-300'

export default function RecordOperationForm({ positions, trackedPositionIds, currencies }: Props) {
  const [operationType, setOperationType] = useState<OperationType>('buy')
  const [positionId, setPositionId] = useState('')
  const [broker, setBroker] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [operationDate, setOperationDate] = useState(new Date().toISOString().slice(0, 10))
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [priceAsOf, setPriceAsOf] = useState(new Date().toISOString().slice(0, 10))
  const [priceSource, setPriceSource] = useState('Mi broker (app o extracto)')
  const [amount, setAmount] = useState('')
  const [fees, setFees] = useState('0')
  const [fxRate, setFxRate] = useState('')
  const [fxAsOf, setFxAsOf] = useState(new Date().toISOString().slice(0, 10))
  const [fxSource, setFxSource] = useState('Banco Central Europeo (BCE)')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const isTrade = operationType === 'buy' || operationType === 'sell'
  const isIncome = operationType === 'dividend' || operationType === 'interest'
  const isFee = operationType === 'fee'
  const needsAmount = !isTrade && operationType !== 'fx_update'
  const chosenPosition = positions.find((position) => position.id === positionId)
  const selectedCurrency = isTrade ? chosenPosition?.currency ?? '' : currency
  const knownCurrencies = Array.from(new Set([...COMMON_CURRENCIES.map((item) => item.code), ...currencies])).sort()

  function changeType(value: OperationType) {
    setOperationType(value)
    setErrorMessage('')
    setSuccessMessage('')
    setAmount('')
    setQuantity('')
    setUnitPrice('')
    setFees('0')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const operationCurrency = selectedCurrency.trim().toUpperCase()
      if (!isCurrencyCodeSupported(operationCurrency)) throw new Error('Selecciona una moneda válida.')
      if (!isTrade && !broker.trim()) throw new Error('Indica el broker o la cuenta de efectivo.')
      if (isTrade && !chosenPosition) throw new Error('Selecciona la posición.')
      if (isTrade && !trackedPositionIds.has(positionId)) throw new Error('Inicia el seguimiento de esta posición desde Posiciones antes de comprar o vender.')
      if (isTrade && (!Number(quantity) || Number(quantity) <= 0 || !Number(unitPrice) || Number(unitPrice) <= 0)) throw new Error('Cantidad y precio de operación deben ser mayores que cero.')
      if (isTrade && (!priceAsOf || !priceSource.trim())) throw new Error('Indica la fecha y fuente del precio de la operación.')
      if (needsAmount && (!Number.isFinite(Number(amount)) || (operationType === 'opening_cash' ? Number(amount) < 0 : Number(amount) <= 0))) throw new Error(operationType === 'opening_cash' ? 'Indica un saldo inicial igual o mayor que cero.' : 'Indica un importe mayor que cero.')
      if (!Number.isFinite(Number(fees)) || Number(fees) < 0) throw new Error('La comisión debe ser igual o mayor que cero.')
      if (operationCurrency !== 'EUR' && (!Number.isFinite(Number(fxRate)) || Number(fxRate) <= 0 || !fxAsOf || !fxSource.trim())) throw new Error('Para convertir a euros, indica EUR por unidad, fecha y fuente del cambio.')

      const { error } = await supabase.rpc('record_portfolio_operation', {
        p_operation: {
          operation_type: operationType,
          position_id: isTrade ? positionId : null,
          broker: isTrade ? chosenPosition?.broker || 'Broker sin especificar' : broker.trim(),
          currency: operationCurrency,
          operation_date: operationDate,
          quantity: isTrade ? Number(quantity) : null,
          unit_price: isTrade ? Number(unitPrice) : null,
          price_as_of: isTrade ? priceAsOf : null,
          price_source: isTrade ? priceSource : null,
          amount: needsAmount ? Number(amount) : null,
          fees: Number(fees),
          fx_rate_to_eur: operationCurrency === 'EUR' ? 1 : Number(fxRate),
          fx_as_of: operationCurrency === 'EUR' ? null : fxAsOf,
          fx_source: operationCurrency === 'EUR' ? null : fxSource,
          notes: notes.trim() || null,
        },
      })
      if (error) throw error
      setSuccessMessage('Operación registrada. La posición y la caja se actualizaron juntas.')
      setAmount('')
      setQuantity('')
      setUnitPrice('')
      setFees('0')
      setNotes('')
      notifyPortfolioChanged()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo registrar la operación.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-teal-300/15 bg-slate-900/60 p-4 sm:p-6">
      <div>
        <h2 className="text-lg text-white">Registrar una operación</h2>
        <p className="mt-1 text-sm text-slate-400">Las compras y ventas actualizan posición y caja en un único paso. El ledger no reconstruye movimientos anteriores.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={labelClass}>Tipo de operación
          <select value={operationType} onChange={(event) => changeType(event.target.value as OperationType)} className={inputClass}>
            <optgroup label="Valores">
              {OPERATION_OPTIONS.filter((option) => option.group === 'position').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </optgroup>
            <optgroup label="Efectivo y rentas">
              {OPERATION_OPTIONS.filter((option) => option.group === 'cash').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </optgroup>
          </select>
        </label>
        {isTrade ? <label className={labelClass}>Posición
          <select value={positionId} onChange={(event) => setPositionId(event.target.value)} required className={inputClass}>
            <option value="">Selecciona una posición</option>
            {positions.map((position) => <option key={position.id} value={position.id}>{position.name} · {position.broker ?? 'broker no indicado'} · {position.currency ?? 'moneda pendiente'}</option>)}
          </select>
        </label> : <label className={labelClass}>Broker / cuenta
          <input value={broker} onChange={(event) => setBroker(event.target.value)} required placeholder="p. ej. Trade Republic" className={inputClass} />
        </label>}
        {!isTrade && <label className={labelClass}>Moneda de la cuenta
          <select value={currency} onChange={(event) => setCurrency(event.target.value)} className={inputClass}>
            {knownCurrencies.map((code) => <option key={code} value={code}>{COMMON_CURRENCIES.find((item) => item.code === code)?.label ?? code}</option>)}
          </select>
        </label>}
        <label className={labelClass}>Fecha de operación
          <input type="date" value={operationDate} onChange={(event) => setOperationDate(event.target.value)} required className={inputClass} />
        </label>
        {isTrade && <>
          <label className={labelClass}>Unidades
            <input type="number" min="0.00000001" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} required className={inputClass} />
          </label>
          <label className={labelClass}>Precio por unidad ({chosenPosition?.currency ?? 'moneda de la posición'})
            <input type="number" min="0.00000001" step="any" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} required className={inputClass} />
          </label>
          <label className={labelClass}>Comisión ({chosenPosition?.currency ?? 'moneda de la posición'})
            <input type="number" min="0" step="any" value={fees} onChange={(event) => setFees(event.target.value)} className={inputClass} />
          </label>
          <label className={labelClass}>Fecha del precio de la operación
            <input type="date" value={priceAsOf} onChange={(event) => setPriceAsOf(event.target.value)} required className={inputClass} />
          </label>
          <label className={labelClass}>Fuente del precio
            <select value={priceSource} onChange={(event) => setPriceSource(event.target.value)} className={inputClass}>
              <option>Mi broker (app o extracto)</option><option>Web del emisor o mercado</option><option>Anotación manual</option>
            </select>
          </label>
          {chosenPosition?.currency && chosenPosition.currency !== 'EUR' && <FxFields currency={chosenPosition.currency} fxRate={fxRate} fxAsOf={fxAsOf} fxSource={fxSource} setFxRate={setFxRate} setFxAsOf={setFxAsOf} setFxSource={setFxSource} />}
        </>}
        {needsAmount && <label className={labelClass}>{operationType === 'opening_cash' ? 'Saldo inicial' : isIncome ? 'Importe bruto' : isFee ? 'Comisión' : 'Importe'} ({currency})
          <input type="number" min={operationType === 'opening_cash' ? '0' : '0.00000001'} step="any" value={amount} onChange={(event) => setAmount(event.target.value)} required className={inputClass} />
        </label>}
        {isIncome && <label className={labelClass}>Comisión descontada ({currency})
          <input type="number" min="0" step="any" value={fees} onChange={(event) => setFees(event.target.value)} className={inputClass} />
        </label>}
        {!isTrade && currency !== 'EUR' && <FxFields currency={currency} fxRate={fxRate} fxAsOf={fxAsOf} fxSource={fxSource} setFxRate={setFxRate} setFxAsOf={setFxAsOf} setFxSource={setFxSource} />}
        <label className="grid gap-1.5 text-sm text-slate-300 sm:col-span-2 lg:col-span-3">Nota (opcional)
          <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Referencia del extracto o comentario" className={inputClass} />
        </label>
      </div>
      {errorMessage && <p role="alert" className="rounded-lg border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-sm text-rose-200">{errorMessage}</p>}
      {successMessage && <p role="status" className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">{successMessage}</p>}
      <button type="submit" disabled={saving} className="w-full rounded-xl bg-teal-300 px-4 py-3 text-sm font-semibold text-slate-950 sm:w-auto">{saving ? 'Guardando…' : 'Guardar operación'}</button>
    </form>
  )
}

function FxFields({ currency, fxRate, fxAsOf, fxSource, setFxRate, setFxAsOf, setFxSource }: {
  currency: string
  fxRate: string
  fxAsOf: string
  fxSource: string
  setFxRate: (value: string) => void
  setFxAsOf: (value: string) => void
  setFxSource: (value: string) => void
}) {
  return <>
    <label className={labelClass}>EUR por 1 {currency}
      <span className="text-xs text-slate-400">Ejemplo: 1 {currency} = 0,92 EUR → escribe 0,92.</span>
      <input type="number" min="0.00000001" step="any" value={fxRate} onChange={(event) => setFxRate(event.target.value)} required className={inputClass} />
    </label>
    <label className={labelClass}>Fecha del cambio<input type="date" value={fxAsOf} onChange={(event) => setFxAsOf(event.target.value)} required className={inputClass} /></label>
    <label className={labelClass}>Fuente del cambio
      <select value={fxSource} onChange={(event) => setFxSource(event.target.value)} className={inputClass}>
        <option>Banco Central Europeo (BCE)</option><option>Mi broker</option><option>Otra fuente oficial</option><option>Anotación manual</option>
      </select>
    </label>
  </>
}
