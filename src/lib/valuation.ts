export type PositionPriceData = {
  quantity: number | null
  avg_price: number | null
  current_price: number | null
  currency: string | null
  price_as_of: string | null
  price_source: string | null
  fx_rate_to_eur: number | null
  fx_as_of: string | null
  fx_source: string | null
  estimated_value_eur?: number | null
  estimated_value_as_of?: string | null
}

export type PositionValuation = {
  complete: boolean
  valueEur: number | null
  quoteCurrency: string | null
  quotePrice: number | null
  reason: string | null
}

export type PositionOverviewValuation = {
  quality: 'confirmed' | 'estimated' | 'missing'
  valueEur: number | null
  asOf: string | null
  reason: string | null
}

export type SnapshotValuationDetail = {
  position_id: string
  position_name: string
  ticker: string | null
  broker: string | null
  quantity: number
  unit_price: number
  currency: string
  price_as_of: string
  price_source: string
  fx_rate_to_eur: number
  fx_as_of: string | null
  fx_source: string | null
  value_eur: number
}

export type PositionWithIdentity = PositionPriceData & {
  id: string
  name: string
  ticker: string | null
  broker: string | null
}

export const ESTIMATE_REVIEW_AFTER_DAYS = 90

function dateOnlyDayNumber(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const timestamp = Date.UTC(year, month - 1, day)
  const parsed = new Date(timestamp)
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null
  return Math.floor(timestamp / 86_400_000)
}

function localDateString(date: Date) {
  const localDate = new Date(date)
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset())
  return localDate.toISOString().slice(0, 10)
}

export function getEstimateAgeDays(asOf: string | null | undefined, today = localDateString(new Date())) {
  if (!asOf) return null
  const estimateDay = dateOnlyDayNumber(asOf)
  const todayDay = dateOnlyDayNumber(today)
  if (estimateDay === null || todayDay === null || estimateDay > todayDay) return null
  return todayDay - estimateDay
}

export function isEstimateDueForReview(asOf: string | null | undefined, today?: string) {
  const ageDays = getEstimateAgeDays(asOf, today)
  return ageDays === null || ageDays > ESTIMATE_REVIEW_AFTER_DAYS
}

export function isCurrencyCodeSupported(value: string) {
  const currency = value.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency) || ['XXX', 'XTS', 'ZZZ'].includes(currency)) return false
  try {
    new Intl.NumberFormat('es-ES', { style: 'currency', currency })
    return true
  } catch {
    return false
  }
}

export function getSnapshotValuationDetail(position: PositionWithIdentity): SnapshotValuationDetail | null {
  const valuation = getPositionValuation(position)
  if (!valuation.complete || valuation.valueEur === null || position.quantity === null || position.current_price === null || !position.currency || !position.price_as_of || !position.price_source) {
    return null
  }

  const currency = position.currency.toUpperCase()
  return {
    position_id: position.id,
    position_name: position.name,
    ticker: position.ticker,
    broker: position.broker,
    quantity: position.quantity,
    unit_price: position.current_price,
    currency,
    price_as_of: position.price_as_of,
    price_source: position.price_source,
    fx_rate_to_eur: currency === 'EUR' ? 1 : position.fx_rate_to_eur!,
    fx_as_of: currency === 'EUR' ? null : position.fx_as_of,
    fx_source: currency === 'EUR' ? 'Moneda base EUR' : position.fx_source,
    value_eur: valuation.valueEur,
  }
}

export function getPositionValuation(position: PositionPriceData): PositionValuation {
  const currency = position.currency?.trim().toUpperCase() || null
  const quotePrice = position.current_price

  if (!currency) {
    return { complete: false, valueEur: null, quoteCurrency: null, quotePrice, reason: 'Falta indicar la moneda de la posición.' }
  }
  if (!isCurrencyCodeSupported(currency)) {
    return { complete: false, valueEur: null, quoteCurrency: null, quotePrice, reason: 'El código de moneda no se reconoce como ISO 4217 en este entorno.' }
  }

  if (quotePrice === null || !Number.isFinite(quotePrice) || quotePrice < 0) {
    return { complete: false, valueEur: null, quoteCurrency: currency, quotePrice, reason: 'Falta un precio actual válido.' }
  }

  if (position.quantity === null || !Number.isFinite(position.quantity) || position.quantity < 0) {
    return { complete: false, valueEur: null, quoteCurrency: currency, quotePrice, reason: 'Falta la cantidad necesaria para calcular el valor desde el precio por unidad.' }
  }

  if (!position.price_as_of || !position.price_source?.trim()) {
    return { complete: false, valueEur: null, quoteCurrency: currency, quotePrice, reason: 'Añade la fecha y el origen del precio actual.' }
  }

  let rate = 1
  if (currency !== 'EUR') {
    if (
      position.fx_rate_to_eur === null ||
      !Number.isFinite(position.fx_rate_to_eur) ||
      position.fx_rate_to_eur <= 0 ||
      !position.fx_as_of ||
      !position.fx_source?.trim()
    ) {
      return { complete: false, valueEur: null, quoteCurrency: currency, quotePrice, reason: 'Falta un tipo de cambio EUR fechado y con origen.' }
    }
    rate = position.fx_rate_to_eur
  }

  return {
    complete: true,
    valueEur: position.quantity * quotePrice * rate,
    quoteCurrency: currency,
    quotePrice,
    reason: null,
  }
}

export function getPositionOverviewValuation(position: PositionPriceData): PositionOverviewValuation {
  const confirmed = getPositionValuation(position)
  if (confirmed.complete && confirmed.valueEur !== null) {
    return {
      quality: 'confirmed',
      valueEur: confirmed.valueEur,
      asOf: position.price_as_of,
      reason: null,
    }
  }

  const estimatedValue = position.estimated_value_eur
  if (estimatedValue !== null && estimatedValue !== undefined && Number.isFinite(estimatedValue) && estimatedValue >= 0) {
    return {
      quality: 'estimated',
      valueEur: estimatedValue,
      asOf: position.estimated_value_as_of ?? null,
      reason: null,
    }
  }

  return {
    quality: 'missing',
    valueEur: null,
    asOf: null,
    reason: confirmed.reason,
  }
}

export function formatCurrency(value: number, currency: string) {
  try {
    return value.toLocaleString('es-ES', { style: 'currency', currency })
  } catch {
    return `${value.toLocaleString('es-ES')} ${currency}`
  }
}
