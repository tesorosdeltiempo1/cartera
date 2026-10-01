'use client'

import { useId, useState } from 'react'
import { isCurrencyCodeSupported } from '@/lib/valuation'
import { COMMON_CURRENCIES } from '@/lib/currencies'

type PriceReferenceKey = 'currency' | 'price_as_of' | 'price_source' | 'fx_rate_to_eur' | 'fx_as_of' | 'fx_source'
type SourceChoice = { value: string; label: string }

type Props = {
  hasCurrentPrice: boolean
  currencyLocked?: boolean
  currency: string
  priceAsOf: string
  priceSource: string
  fxRateToEur: string
  fxAsOf: string
  fxSource: string
  onChange: (field: PriceReferenceKey, value: string) => void
}

const PRICE_SOURCES: SourceChoice[] = [
  { value: 'Mi broker (app o extracto)', label: 'Mi broker (app o extracto)' },
  { value: 'Web del emisor o mercado', label: 'Web del emisor o mercado' },
  { value: 'Anotación manual', label: 'Anotación manual' },
]

const FX_SOURCES: SourceChoice[] = [
  { value: 'Banco Central Europeo (BCE)', label: 'Banco Central Europeo (BCE)' },
  { value: 'Mi broker', label: 'Mi broker' },
  { value: 'Otra fuente oficial', label: 'Otra fuente oficial' },
  { value: 'Anotación manual', label: 'Anotación manual' },
]

const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-teal-300/50 focus:outline-none'
const labelClass = 'grid min-w-0 gap-1.5 text-sm text-slate-300'

function SourceField({
  id,
  label,
  value,
  choices,
  onChange,
}: {
  id: string
  label: string
  value: string
  choices: SourceChoice[]
  onChange: (value: string) => void
}) {
  const knownChoice = choices.some((choice) => choice.value === value)
  const custom = Boolean(value) && !knownChoice
  const selectedValue = knownChoice ? value : custom ? '__custom__' : ''

  return (
    <label className={labelClass} htmlFor={id}>
      {label}
      <select
        id={id}
        value={selectedValue}
        onChange={(event) => {
          if (event.target.value === '__custom__') {
            onChange(custom ? value : '__custom__')
            return
          }
          onChange(event.target.value)
        }}
        required
        className={inputClass}
      >
        <option value="" disabled>Elige una opción</option>
        {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
        <option value="__custom__">Otra (especificar)</option>
      </select>
      {selectedValue === '__custom__' && (
        <input
          value={custom && value !== '__custom__' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Escribe dónde lo consultaste"
          aria-label={`${label}: especificar`}
          required
          className={inputClass}
        />
      )}
    </label>
  )
}

export default function PriceReferenceFields({
  hasCurrentPrice,
  currencyLocked = false,
  currency,
  priceAsOf,
  priceSource,
  fxRateToEur,
  fxAsOf,
  fxSource,
  onChange,
}: Props) {
  const idPrefix = useId()
  const [useSameDate, setUseSameDate] = useState((!fxAsOf && !priceAsOf) || Boolean(fxAsOf && priceAsOf && fxAsOf === priceAsOf))
  const commonCurrency = COMMON_CURRENCIES.some((item) => item.code === currency)
  const selectedCurrency = commonCurrency ? currency : currency ? '__other__' : ''
  const foreignCurrency = hasCurrentPrice && isCurrencyCodeSupported(currency) && currency.trim().toUpperCase() !== 'EUR'

  function handlePriceDateChange(value: string) {
    onChange('price_as_of', value)
    if (useSameDate) onChange('fx_as_of', value)
  }

  function handleSameDateChange(checked: boolean) {
    setUseSameDate(checked)
    if (checked) onChange('fx_as_of', priceAsOf)
  }

  return (
    <fieldset className="col-span-full grid gap-3 rounded-xl border border-teal-300/15 bg-black/10 p-3 sm:p-4">
      <legend className="px-2 text-sm font-medium text-teal-100">Moneda y referencia del precio</legend>
      <p className="text-xs leading-5 text-slate-400">Mira en tu broker en qué moneda aparece el precio. El código es el que figura junto al importe; por ejemplo, EUR (euro) o USD (dólar).</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass} htmlFor={`${idPrefix}-currency`}>
          Moneda del precio
          <select
            id={`${idPrefix}-currency`}
            value={selectedCurrency}
            onChange={(event) => onChange('currency', event.target.value === '__other__' ? '__other__' : event.target.value)}
            required
            disabled={currencyLocked}
            className={inputClass}
          >
            <option value="" disabled>Selecciona la moneda</option>
            {COMMON_CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            <option value="__other__">Otra moneda…</option>
          </select>
          {selectedCurrency === '__other__' && (
            <input
              value={currency === '__other__' ? '' : currency}
              onChange={(event) => onChange('currency', event.target.value.toUpperCase())}
              placeholder="Código de 3 letras (p. ej. MXN)"
              aria-label="Código de otra moneda"
              maxLength={3}
              pattern="[A-Za-z]{3}"
              required
              disabled={currencyLocked}
              className={inputClass}
            />
          )}
        </label>

        {hasCurrentPrice && <>
          <label className={labelClass} htmlFor={`${idPrefix}-price-as-of`}>
            Fecha a la que corresponde el precio
            <input id={`${idPrefix}-price-as-of`} value={priceAsOf} onChange={(event) => handlePriceDateChange(event.target.value)} type="date" required className={inputClass} />
          </label>

          <SourceField
            id={`${idPrefix}-price-source`}
            label="¿Dónde consultaste el precio?"
            value={priceSource}
            choices={PRICE_SOURCES}
            onChange={(value) => onChange('price_source', value)}
          />
        </>}
      </div>
      {currencyLocked && <p className="text-xs text-slate-400">La moneda queda fijada al iniciar el ledger para preservar la coherencia del historial de operaciones.</p>}

      {foreignCurrency && <div className="grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-2">
        <label className={labelClass} htmlFor={`${idPrefix}-fx-rate-to-eur`}>
          Tipo de cambio a euros
          <span className="text-xs font-normal leading-5 text-slate-400">¿Cuántos euros vale una unidad de {currency.toUpperCase()}? Si vale 0,92 EUR, escribe 0,92.</span>
          <input id={`${idPrefix}-fx-rate-to-eur`} name="fx_rate_to_eur" value={fxRateToEur} onChange={(event) => onChange('fx_rate_to_eur', event.target.value)} type="number" min="0" step="any" required className={inputClass} />
        </label>

        <div className="grid gap-2 content-start">
          <label className="flex min-h-10 items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={useSameDate} onChange={(event) => handleSameDateChange(event.target.checked)} className="size-4 accent-amber-300" />
            El cambio corresponde al mismo día del precio
          </label>
          {useSameDate ? (
            <p className="text-xs leading-5 text-slate-400">Se usará la fecha indicada arriba: {priceAsOf || 'elige primero la fecha del precio'}.</p>
          ) : (
            <label className={labelClass} htmlFor={`${idPrefix}-fx-as-of`}>
              Fecha del tipo de cambio
              <input id={`${idPrefix}-fx-as-of`} value={fxAsOf} onChange={(event) => onChange('fx_as_of', event.target.value)} type="date" required className={inputClass} />
            </label>
          )}
        </div>

        <SourceField
          id={`${idPrefix}-fx-source`}
          label="¿De dónde sale el tipo de cambio?"
          value={fxSource}
          choices={FX_SOURCES}
          onChange={(value) => onChange('fx_source', value)}
        />
      </div>}
    </fieldset>
  )
}
