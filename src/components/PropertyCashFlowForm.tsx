'use client'

import { useState, type FormEvent } from 'react'
import { COMMON_CURRENCIES } from '@/lib/currencies'
import type { CashAccount } from '@/lib/ledger'
import { notifyPortfolioChanged } from '@/lib/portfolioEvents'
import type { MortgageLiability, RealEstateAsset } from '@/lib/wealth'
import { isCurrencyCodeSupported } from '@/lib/valuation'
import { supabase } from '@/lib/supabase'

type FlowType = 'rental_income' | 'property_expense' | 'mortgage_payment'

const flowTypes: { value: FlowType; label: string }[] = [
  { value: 'rental_income', label: 'Alquiler cobrado' },
  { value: 'property_expense', label: 'Gasto del inmueble' },
  { value: 'mortgage_payment', label: 'Pago hipotecario' },
]
const expenseCategories = [
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'tax', label: 'Impuestos' },
  { value: 'insurance', label: 'Seguro' },
  { value: 'community', label: 'Comunidad' },
  { value: 'other', label: 'Otro gasto' },
]
const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-teal-300/50 focus:outline-none'
const labelClass = 'grid min-w-0 gap-1.5 text-sm text-slate-300'

export default function PropertyCashFlowForm({
  properties,
  mortgages,
  cashAccounts,
  onSaved,
}: {
  properties: RealEstateAsset[]
  mortgages: MortgageLiability[]
  cashAccounts: CashAccount[]
  onSaved: () => void
}) {
  const [operationType, setOperationType] = useState<FlowType>('rental_income')
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? '')
  const [mortgageId, setMortgageId] = useState('')
  const [cashAccountId, setCashAccountId] = useState(cashAccounts[0]?.id ?? '__new__')
  const [newCashBroker, setNewCashBroker] = useState('')
  const [newCurrencyOption, setNewCurrencyOption] = useState('EUR')
  const [customCurrency, setCustomCurrency] = useState('')
  const [operationDate, setOperationDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [principalAmount, setPrincipalAmount] = useState('')
  const [flowCategory, setFlowCategory] = useState('maintenance')
  const [fxRate, setFxRate] = useState('')
  const [fxAsOf, setFxAsOf] = useState(new Date().toISOString().slice(0, 10))
  const [fxSource, setFxSource] = useState('Banco Central Europeo (BCE)')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const propertyMortgages = mortgages.filter((mortgage) => mortgage.property_id === propertyId)
  const selectedMortgage = propertyMortgages.find((mortgage) => mortgage.id === mortgageId) ?? propertyMortgages[0]
  const availableAccounts = operationType === 'mortgage_payment' && selectedMortgage
    ? cashAccounts.filter((account) => account.currency === selectedMortgage.currency)
    : cashAccounts
  const selectedAccount = availableAccounts.find((account) => account.id === cashAccountId)
  const isNewCashAccount = !selectedAccount
  const newCurrency = newCurrencyOption === '__other__' ? customCurrency.trim().toUpperCase() : newCurrencyOption
  const currency = selectedAccount?.currency ?? (operationType === 'mortgage_payment' ? selectedMortgage?.currency ?? '' : newCurrency)
  const isForeignCurrency = currency !== '' && currency !== 'EUR'

  function handleFlowTypeChange(nextType: FlowType) {
    setOperationType(nextType)
    setErrorMessage('')
    setSuccessMessage('')
    setAmount('')
    setPrincipalAmount('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    const parsedAmount = Number(amount)
    const parsedPrincipal = operationType === 'mortgage_payment' ? Number(principalAmount) : 0
    const broker = selectedAccount?.broker ?? newCashBroker.trim()
    const parsedRate = Number(fxRate)
    if (!propertyId || !broker) {
      setErrorMessage('Selecciona un inmueble y una cuenta de efectivo.')
      setSaving(false)
      return
    }
    if (!isCurrencyCodeSupported(currency)) {
      setErrorMessage('Selecciona una moneda reconocida para el movimiento.')
      setSaving(false)
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('El importe debe ser mayor que cero.')
      setSaving(false)
      return
    }
    if (operationType === 'property_expense' && !expenseCategories.some((category) => category.value === flowCategory)) {
      setErrorMessage('Selecciona una categoría de gasto.')
      setSaving(false)
      return
    }
    if (operationType === 'mortgage_payment') {
      if (!selectedMortgage) {
        setErrorMessage('Selecciona una hipoteca de este inmueble.')
        setSaving(false)
        return
      }
      if (currency !== selectedMortgage.currency) {
        setErrorMessage('La moneda de la cuenta debe coincidir con la moneda de la hipoteca.')
        setSaving(false)
        return
      }
      if (!Number.isFinite(parsedPrincipal) || parsedPrincipal < 0 || parsedPrincipal > parsedAmount) {
        setErrorMessage('El principal debe estar entre cero y el importe total pagado.')
        setSaving(false)
        return
      }
    }
    if (isForeignCurrency && (!Number.isFinite(parsedRate) || parsedRate <= 0 || !fxAsOf || !fxSource.trim())) {
      setErrorMessage('Para convertir a euros, indica un cambio positivo, su fecha y fuente.')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase.rpc('record_property_cash_flow', {
        p_flow: {
          property_id: propertyId,
          mortgage_id: operationType === 'mortgage_payment' ? selectedMortgage?.id : null,
          operation_type: operationType,
          operation_date: operationDate,
          cash_broker: broker,
          currency,
          amount: parsedAmount,
          principal_amount: parsedPrincipal,
          flow_category: operationType === 'property_expense' ? flowCategory : null,
          fx_rate_to_eur: isForeignCurrency ? parsedRate : 1,
          fx_as_of: isForeignCurrency ? fxAsOf : null,
          fx_source: isForeignCurrency ? fxSource : null,
          notes: notes.trim() || null,
        },
      })
      if (error) throw error
      setSuccessMessage(operationType === 'mortgage_payment'
        ? 'Pago guardado: caja y principal hipotecario actualizados juntos.'
        : 'Movimiento inmobiliario guardado en el libro de caja.')
      setAmount('')
      setPrincipalAmount('')
      setNotes('')
      notifyPortfolioChanged()
      onSaved()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 border-t border-white/10 pt-4">
      <div>
        <h3 className="font-medium text-white">Registrar un movimiento real</h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">Solo movimientos ya cobrados o pagados. El principal reduce la deuda; los intereses no se mezclan con la rentabilidad bursátil.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={labelClass}>Movimiento
          <select value={operationType} onChange={(event) => handleFlowTypeChange(event.target.value as FlowType)} className={inputClass}>
            {flowTypes.map((flow) => <option key={flow.value} value={flow.value}>{flow.label}</option>)}
          </select>
        </label>
        <label className={labelClass}>Inmueble
          <select value={propertyId} onChange={(event) => {
            const nextPropertyId = event.target.value
            setPropertyId(nextPropertyId)
            setMortgageId('')
            if (operationType === 'mortgage_payment' && !mortgages.some((mortgage) => mortgage.property_id === nextPropertyId)) {
              setOperationType('rental_income')
            }
          }} required className={inputClass}>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
          </select>
        </label>
        {operationType === 'mortgage_payment' && <label className={labelClass}>Hipoteca
          <select value={selectedMortgage?.id ?? ''} onChange={(event) => setMortgageId(event.target.value)} required className={inputClass}>
            {propertyMortgages.map((mortgage) => <option key={mortgage.id} value={mortgage.id}>{mortgage.name} · saldo {Number(mortgage.current_balance).toLocaleString('es-ES')} {mortgage.currency}</option>)}
          </select>
        </label>}
        <label className={labelClass}>Cuenta donde se movió el dinero
          <select value={selectedAccount?.id ?? '__new__'} onChange={(event) => setCashAccountId(event.target.value)} className={inputClass}>
            {availableAccounts.map((account) => <option key={account.id} value={account.id}>{account.broker} · {account.currency}</option>)}
            <option value="__new__">Otra cuenta…</option>
          </select>
        </label>
        {isNewCashAccount && <label className={labelClass}>Nombre de la cuenta o banco
          <input value={newCashBroker} onChange={(event) => setNewCashBroker(event.target.value)} required maxLength={120} placeholder="p. ej. Cuenta bancaria" className={inputClass} />
        </label>}
        {isNewCashAccount && operationType !== 'mortgage_payment' && <label className={labelClass}>Moneda del movimiento
          <select value={newCurrencyOption} onChange={(event) => setNewCurrencyOption(event.target.value)} className={inputClass}>
            {COMMON_CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            <option value="__other__">Otra moneda…</option>
          </select>
          {newCurrencyOption === '__other__' && <input
            value={customCurrency}
            onChange={(event) => setCustomCurrency(event.target.value.toUpperCase())}
            placeholder="Código de 3 letras (p. ej. MXN)"
            aria-label="Código de otra moneda"
            maxLength={3}
            pattern="[A-Za-z]{3}"
            required
            className={inputClass}
          />}
        </label>}
        {isNewCashAccount && operationType === 'mortgage_payment' && <div className={labelClass}>Moneda del movimiento
          <span className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm">{currency || 'Selecciona una hipoteca'}</span>
        </div>}
        <label className={labelClass}>Fecha
          <input type="date" value={operationDate} onChange={(event) => setOperationDate(event.target.value)} required className={inputClass} />
        </label>
        <label className={labelClass}>{operationType === 'mortgage_payment' ? `Pago total (${currency})` : `${operationType === 'rental_income' ? 'Alquiler cobrado' : 'Gasto pagado'} (${currency})`}
          <input type="number" min="0.01" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} required className={inputClass} />
        </label>
        {operationType === 'mortgage_payment' && <label className={labelClass}>Parte que amortiza principal ({currency})
          <input type="number" min="0" step="any" value={principalAmount} onChange={(event) => setPrincipalAmount(event.target.value)} required className={inputClass} />
        </label>}
        {operationType === 'property_expense' && <label className={labelClass}>Categoría del gasto
          <select value={flowCategory} onChange={(event) => setFlowCategory(event.target.value)} className={inputClass}>
            {expenseCategories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
          </select>
        </label>}
        {isForeignCurrency && <>
          <label className={labelClass}>EUR por 1 {currency}
            <input type="number" min="0.00000001" step="any" value={fxRate} onChange={(event) => setFxRate(event.target.value)} required className={inputClass} />
          </label>
          <label className={labelClass}>Fecha del cambio
            <input type="date" value={fxAsOf} onChange={(event) => setFxAsOf(event.target.value)} required className={inputClass} />
          </label>
          <label className={labelClass}>Fuente del cambio
            <select value={fxSource} onChange={(event) => setFxSource(event.target.value)} className={inputClass}>
              <option>Banco Central Europeo (BCE)</option>
              <option>Mi banco</option>
              <option>Anotación manual</option>
            </select>
          </label>
        </>}
        <label className="grid gap-1.5 text-sm text-slate-300 sm:col-span-2 lg:col-span-3">Nota opcional
          <input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} placeholder="Referencia del recibo o comentario" className={inputClass} />
        </label>
      </div>
      {errorMessage && <p role="alert" className="text-sm text-rose-200">{errorMessage}</p>}
      {successMessage && <p role="status" className="text-sm text-emerald-200">{successMessage}</p>}
      <button type="submit" disabled={saving || properties.length === 0} className="w-full rounded-lg bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50 sm:w-fit">{saving ? 'Guardando…' : 'Guardar movimiento'}</button>
    </form>
  )
}
