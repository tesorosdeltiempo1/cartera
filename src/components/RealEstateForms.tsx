'use client'

import { useState, type FormEvent } from 'react'
import { COMMON_CURRENCIES } from '@/lib/currencies'
import type { MortgageLiability, RealEstateAsset } from '@/lib/wealth'
import { supabase } from '@/lib/supabase'
import { isCurrencyCodeSupported } from '@/lib/valuation'

const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-teal-300/50 focus:outline-none'
const labelClass = 'grid min-w-0 gap-1.5 text-sm text-slate-300'
const sourceOptions = ['Mi banco (app o extracto)', 'Tasación profesional', 'Anotación manual']
const propertyTypes = [
  { value: 'home', label: 'Vivienda' },
  { value: 'rental', label: 'Vivienda alquilada' },
  { value: 'land', label: 'Terreno' },
  { value: 'other', label: 'Otro inmueble' },
]

function ValuationFields({
  currency,
  setCurrency,
  valueDate,
  setValueDate,
  valueSource,
  setValueSource,
  fxRate,
  setFxRate,
  fxDate,
  setFxDate,
  fxSource,
  setFxSource,
  valueLabel,
}: {
  currency: string
  setCurrency: (value: string) => void
  valueDate: string
  setValueDate: (value: string) => void
  valueSource: string
  setValueSource: (value: string) => void
  fxRate: string
  setFxRate: (value: string) => void
  fxDate: string
  setFxDate: (value: string) => void
  fxSource: string
  setFxSource: (value: string) => void
  valueLabel: string
}) {
  const isCommonCurrency = COMMON_CURRENCIES.some((item) => item.code === currency)
  const selectedCurrency = isCommonCurrency ? currency : '__other__'

  return <>
    <label className={labelClass}>Moneda
      <select
        value={selectedCurrency}
        onChange={(event) => setCurrency(event.target.value === '__other__' ? (selectedCurrency === '__other__' ? currency : '__other__') : event.target.value)}
        required
        className={inputClass}
      >
        {COMMON_CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        <option value="__other__">Otra moneda…</option>
      </select>
      {selectedCurrency === '__other__' && <input
        value={currency === '__other__' ? '' : currency}
        onChange={(event) => setCurrency(event.target.value.toUpperCase())}
        placeholder="Código de 3 letras (p. ej. MXN)"
        aria-label="Código de moneda"
        maxLength={3}
        pattern="[A-Za-z]{3}"
        required
        className={inputClass}
      />}
    </label>
    <label className={labelClass}>Fecha del {valueLabel}
      <input type="date" value={valueDate} onChange={(event) => setValueDate(event.target.value)} required className={inputClass} />
    </label>
    <label className={labelClass}>Fuente del {valueLabel}
      <select value={valueSource} onChange={(event) => setValueSource(event.target.value)} required className={inputClass}>
        {sourceOptions.map((source) => <option key={source}>{source}</option>)}
      </select>
    </label>
    {currency !== 'EUR' && <>
      <label className={labelClass}>EUR por 1 {currency}
        <span className="text-xs text-slate-400">Indica cuántos euros vale una unidad de esta moneda.</span>
        <input type="number" min="0.00000001" step="any" value={fxRate} onChange={(event) => setFxRate(event.target.value)} required className={inputClass} />
      </label>
      <label className={labelClass}>Fecha del tipo de cambio
        <input type="date" value={fxDate} onChange={(event) => setFxDate(event.target.value)} required className={inputClass} />
      </label>
      <label className={labelClass}>Fuente del tipo de cambio
        <select value={fxSource} onChange={(event) => setFxSource(event.target.value)} required className={inputClass}>
          <option>Banco Central Europeo (BCE)</option>
          <option>Mi banco</option>
          <option>Anotación manual</option>
        </select>
      </label>
    </>}
  </>
}

export function RealEstateForm({ property, onSaved, onCancel }: {
  property?: RealEstateAsset
  onSaved: () => void
  onCancel?: () => void
}) {
  const [name, setName] = useState(property?.name ?? '')
  const [propertyType, setPropertyType] = useState(property?.property_type ?? 'home')
  const [ownershipPercentage, setOwnershipPercentage] = useState(String(property?.ownership_percentage ?? 100))
  const [currentValue, setCurrentValue] = useState(property?.current_value == null ? '' : String(property.current_value))
  const [currency, setCurrency] = useState(property?.currency ?? 'EUR')
  const [valuationAsOf, setValuationAsOf] = useState(property?.valuation_as_of ?? new Date().toISOString().slice(0, 10))
  const [valuationSource, setValuationSource] = useState(property?.valuation_source ?? sourceOptions[0])
  const [fxRate, setFxRate] = useState(property?.fx_rate_to_eur == null ? '' : String(property.fx_rate_to_eur))
  const [fxAsOf, setFxAsOf] = useState(property?.fx_as_of ?? new Date().toISOString().slice(0, 10))
  const [fxSource, setFxSource] = useState(property?.fx_source ?? 'Banco Central Europeo (BCE)')
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')

    const ownership = Number(ownershipPercentage)
    const value = Number(currentValue)
    const rate = Number(fxRate)
    if (!isCurrencyCodeSupported(currency)) {
      setErrorMessage('Selecciona o escribe un código de moneda reconocido.')
      setSaving(false)
      return
    }
    if (!Number.isFinite(ownership) || ownership <= 0 || ownership > 100 || !Number.isFinite(value) || value < 0) {
      setErrorMessage('Revisa el porcentaje y el valor estimado del inmueble.')
      setSaving(false)
      return
    }
    if (currency !== 'EUR' && (!Number.isFinite(rate) || rate <= 0 || !fxAsOf || !fxSource.trim())) {
      setErrorMessage('Para convertir a EUR, indica un cambio positivo, su fecha y fuente.')
      setSaving(false)
      return
    }

    const values = {
      name: name.trim(),
      property_type: propertyType,
      ownership_percentage: ownership,
      current_value: value,
      currency,
      valuation_as_of: valuationAsOf,
      valuation_source: valuationSource.trim(),
      fx_rate_to_eur: currency === 'EUR' ? null : rate,
      fx_as_of: currency === 'EUR' ? null : fxAsOf,
      fx_source: currency === 'EUR' ? null : fxSource.trim(),
    }

    try {
      const result = property
        ? await supabase.from('real_estate_assets').update(values).eq('id', property.id).select('id').single()
        : await supabase.from('real_estate_assets').insert(values).select('id').single()
      if (result.error) throw result.error
      if (!result.data) throw new Error('No se recibió confirmación del inmueble.')
      onSaved()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar el inmueble.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
      <div>
        <h3 className="font-semibold text-white">{property ? 'Editar inmueble' : 'Añadir inmueble'}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">Valor del inmueble completo, antes de descontar hipotecas. No hace falta guardar la dirección.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={labelClass}>Nombre de referencia
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} placeholder="p. ej. Vivienda principal" className={inputClass} />
        </label>
        <label className={labelClass}>Tipo de inmueble
          <select value={propertyType} onChange={(event) => setPropertyType(event.target.value)} className={inputClass}>
            {propertyTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className={labelClass}>Parte que te pertenece (%)
          <input type="number" min="0.01" max="100" step="any" value={ownershipPercentage} onChange={(event) => setOwnershipPercentage(event.target.value)} required className={inputClass} />
        </label>
        <label className={labelClass}>Valor estimado total
          <input type="number" min="0" step="any" value={currentValue} onChange={(event) => setCurrentValue(event.target.value)} required className={inputClass} />
        </label>
        <ValuationFields
          currency={currency}
          setCurrency={setCurrency}
          valueDate={valuationAsOf}
          setValueDate={setValuationAsOf}
          valueSource={valuationSource}
          setValueSource={setValuationSource}
          fxRate={fxRate}
          setFxRate={setFxRate}
          fxDate={fxAsOf}
          setFxDate={setFxAsOf}
          fxSource={fxSource}
          setFxSource={setFxSource}
          valueLabel="valoración"
        />
      </div>
      {errorMessage && <p role="alert" className="text-sm text-rose-200">{errorMessage}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="rounded-lg bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">{saving ? 'Guardando…' : property ? 'Guardar cambios' : 'Añadir inmueble'}</button>
        {onCancel && <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300">Cancelar</button>}
      </div>
    </form>
  )
}

export function MortgageForm({ properties, mortgage, onSaved, onCancel }: {
  properties: RealEstateAsset[]
  mortgage?: MortgageLiability
  onSaved: () => void
  onCancel?: () => void
}) {
  const [propertyId, setPropertyId] = useState(mortgage?.property_id ?? properties[0]?.id ?? '')
  const [name, setName] = useState(mortgage?.name ?? 'Hipoteca')
  const [ownershipPercentage, setOwnershipPercentage] = useState(String(mortgage?.ownership_percentage ?? 100))
  const [balance, setBalance] = useState(mortgage?.current_balance == null ? '' : String(mortgage.current_balance))
  const [currency, setCurrency] = useState(mortgage?.currency ?? 'EUR')
  const [balanceAsOf, setBalanceAsOf] = useState(mortgage?.balance_as_of ?? new Date().toISOString().slice(0, 10))
  const [balanceSource, setBalanceSource] = useState(mortgage?.balance_source ?? sourceOptions[0])
  const [fxRate, setFxRate] = useState(mortgage?.fx_rate_to_eur == null ? '' : String(mortgage.fx_rate_to_eur))
  const [fxAsOf, setFxAsOf] = useState(mortgage?.fx_as_of ?? new Date().toISOString().slice(0, 10))
  const [fxSource, setFxSource] = useState(mortgage?.fx_source ?? 'Banco Central Europeo (BCE)')
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')

    const ownership = Number(ownershipPercentage)
    const currentBalance = Number(balance)
    const rate = Number(fxRate)
    if (!isCurrencyCodeSupported(currency)) {
      setErrorMessage('Selecciona o escribe un código de moneda reconocido.')
      setSaving(false)
      return
    }
    if (!propertyId || !Number.isFinite(ownership) || ownership <= 0 || ownership > 100 || !Number.isFinite(currentBalance) || currentBalance < 0) {
      setErrorMessage('Revisa el inmueble, el porcentaje y el saldo pendiente.')
      setSaving(false)
      return
    }
    if (currency !== 'EUR' && (!Number.isFinite(rate) || rate <= 0 || !fxAsOf || !fxSource.trim())) {
      setErrorMessage('Para convertir a EUR, indica un cambio positivo, su fecha y fuente.')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase.rpc('save_mortgage_liability', {
        p_mortgage_id: mortgage?.id ?? null,
        p_property_id: propertyId,
        p_name: name.trim(),
        p_ownership_percentage: ownership,
        p_current_balance: currentBalance,
        p_currency: currency,
        p_balance_as_of: balanceAsOf,
        p_balance_source: balanceSource.trim(),
        p_fx_rate_to_eur: currency === 'EUR' ? null : rate,
        p_fx_as_of: currency === 'EUR' ? null : fxAsOf,
        p_fx_source: currency === 'EUR' ? null : fxSource.trim(),
      })
      if (error) throw error
      onSaved()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar la hipoteca.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
      <div>
        <h3 className="font-semibold text-white">{mortgage ? 'Actualizar saldo hipotecario' : 'Añadir hipoteca'}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">Anota el saldo que queda por pagar y la parte de esa deuda que te corresponde.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={labelClass}>Inmueble
          <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} required disabled={Boolean(mortgage)} className={inputClass}>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
          </select>
        </label>
        <label className={labelClass}>Nombre de referencia
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} placeholder="p. ej. Hipoteca principal" className={inputClass} />
        </label>
        <label className={labelClass}>Parte de la deuda que te corresponde (%)
          <input type="number" min="0.01" max="100" step="any" value={ownershipPercentage} onChange={(event) => setOwnershipPercentage(event.target.value)} required className={inputClass} />
        </label>
        <label className={labelClass}>Saldo pendiente total
          <input type="number" min="0" step="any" value={balance} onChange={(event) => setBalance(event.target.value)} required className={inputClass} />
        </label>
        <ValuationFields
          currency={currency}
          setCurrency={setCurrency}
          valueDate={balanceAsOf}
          setValueDate={setBalanceAsOf}
          valueSource={balanceSource}
          setValueSource={setBalanceSource}
          fxRate={fxRate}
          setFxRate={setFxRate}
          fxDate={fxAsOf}
          setFxDate={setFxAsOf}
          fxSource={fxSource}
          setFxSource={setFxSource}
          valueLabel="saldo"
        />
      </div>
      {errorMessage && <p role="alert" className="text-sm text-rose-200">{errorMessage}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="rounded-lg bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">{saving ? 'Guardando…' : mortgage ? 'Guardar saldo' : 'Añadir hipoteca'}</button>
        {onCancel && <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300">Cancelar</button>}
      </div>
    </form>
  )
}