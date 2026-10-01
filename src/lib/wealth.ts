import { isCurrencyCodeSupported } from '@/lib/valuation'

type Numeric = number | string

type ValuationInput = {
  currency: string | null
  value: Numeric | null
  value_as_of: string | null
  value_source: string | null
  fx_rate_to_eur: Numeric | null
  fx_as_of: string | null
  fx_source: string | null
  ownership_percentage: Numeric
}

export type RealEstateAsset = {
  id: string
  name: string
  property_type: string
  mortgage_status: 'unreviewed' | 'none' | 'registered'
  ownership_percentage: Numeric
  current_value: Numeric
  currency: string
  valuation_as_of: string
  valuation_source: string
  fx_rate_to_eur: Numeric | null
  fx_as_of: string | null
  fx_source: string | null
}

export type MortgageLiability = {
  id: string
  property_id: string
  name: string
  ownership_percentage: Numeric
  current_balance: Numeric
  currency: string
  balance_as_of: string
  balance_source: string
  fx_rate_to_eur: Numeric | null
  fx_as_of: string | null
  fx_source: string | null
}

export type WealthSnapshot = {
  id: string
  snapshot_date: string
  financial_assets_eur: Numeric
  cash_eur: Numeric
  real_estate_eur: Numeric
  mortgage_debt_eur: Numeric
  net_worth_eur: Numeric
  property_detail: RealEstateSnapshotDetail[]
  mortgage_detail: MortgageSnapshotDetail[]
}

export type RealEstateSnapshotDetail = {
  property_id: string
  name: string
  property_type: string
  ownership_percentage: number
  value: number
  currency: string
  value_as_of: string
  value_source: string
  fx_rate_to_eur: number
  fx_as_of: string | null
  fx_source: string | null
  value_eur: number
}

export type MortgageSnapshotDetail = {
  mortgage_id: string
  property_id: string
  property_name: string
  name: string
  ownership_percentage: number
  balance: number
  currency: string
  balance_as_of: string
  balance_source: string
  fx_rate_to_eur: number
  fx_as_of: string | null
  fx_source: string | null
  value_eur: number
}

export type WealthValuation = {
  complete: boolean
  valueEur: number | null
  reason: string | null
}

function validateValuation(input: ValuationInput, valueLabel: string): WealthValuation {
  const currency = input.currency?.trim().toUpperCase() ?? ''
  const value = input.value === null ? null : Number(input.value)
  const ownershipPercentage = Number(input.ownership_percentage)

  if (!isCurrencyCodeSupported(currency)) {
    return { complete: false, valueEur: null, reason: 'Confirma la moneda.' }
  }
  if (value === null || !Number.isFinite(value) || value < 0) {
    return { complete: false, valueEur: null, reason: `Añade un ${valueLabel} válido.` }
  }
  if (!input.value_as_of || !input.value_source?.trim()) {
    return { complete: false, valueEur: null, reason: `Añade la fecha y fuente del ${valueLabel}.` }
  }
  if (!Number.isFinite(ownershipPercentage) || ownershipPercentage <= 0 || ownershipPercentage > 100) {
    return { complete: false, valueEur: null, reason: 'Revisa el porcentaje atribuible al propietario.' }
  }

  let fxRate = 1
  if (currency !== 'EUR') {
    fxRate = Number(input.fx_rate_to_eur)
    if (!Number.isFinite(fxRate) || fxRate <= 0 || !input.fx_as_of || !input.fx_source?.trim()) {
      return { complete: false, valueEur: null, reason: 'Añade un cambio a EUR fechado y con fuente.' }
    }
  }

  return {
    complete: true,
    valueEur: value * ownershipPercentage / 100 * fxRate,
    reason: null,
  }
}

export function getPropertyValuation(property: RealEstateAsset): WealthValuation {
  return validateValuation({
    currency: property.currency,
    value: property.current_value,
    value_as_of: property.valuation_as_of,
    value_source: property.valuation_source,
    fx_rate_to_eur: property.fx_rate_to_eur,
    fx_as_of: property.fx_as_of,
    fx_source: property.fx_source,
    ownership_percentage: property.ownership_percentage,
  }, 'valor estimado')
}

export function getMortgageValuation(mortgage: MortgageLiability): WealthValuation {
  return validateValuation({
    currency: mortgage.currency,
    value: mortgage.current_balance,
    value_as_of: mortgage.balance_as_of,
    value_source: mortgage.balance_source,
    fx_rate_to_eur: mortgage.fx_rate_to_eur,
    fx_as_of: mortgage.fx_as_of,
    fx_source: mortgage.fx_source,
    ownership_percentage: mortgage.ownership_percentage,
  }, 'saldo pendiente')
}

export function summarizeWealth(
  financialAssetsEur: number,
  cashEur: number,
  propertyValuesEur: number[],
  mortgageValuesEur: number[],
) {
  const realEstateEur = propertyValuesEur.reduce((total, value) => total + value, 0)
  const mortgageDebtEur = mortgageValuesEur.reduce((total, value) => total + value, 0)
  return {
    financialAssetsEur,
    cashEur,
    realEstateEur,
    mortgageDebtEur,
    netWorthEur: financialAssetsEur + cashEur + realEstateEur - mortgageDebtEur,
  }
}