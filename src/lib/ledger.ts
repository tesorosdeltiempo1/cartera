export type LedgerPosition = {
  id: string
  name: string
  broker: string | null
  currency: string | null
  quantity: number
  avg_price: number | null
  current_price: number | null
  cost_basis_eur: number | null
  ledger_started_at: string | null
  price_as_of: string | null
  price_source: string | null
  fx_rate_to_eur: number | null
  fx_as_of: string | null
  fx_source: string | null
}

export type LedgerTransaction = {
  id: string
  position_id: string | null
  cash_account_id: string
  broker: string
  operation_type: string
  operation_date: string
  quantity: number | null
  unit_price: number | null
  price_as_of: string | null
  price_source: string | null
  amount: number | null
  fees: number
  currency: string
  fx_rate_to_eur: number
  fx_as_of: string | null
  fx_source: string | null
  cash_amount: number
  realized_pnl_native: number
  realized_pnl_eur: number
  notes: string | null
}

export type CashAccount = {
  id: string
  broker: string
  currency: string
  current_fx_rate_to_eur: number
  fx_as_of: string | null
  fx_source: string | null
}

export type CashAccountSummary = CashAccount & {
  balance: number
  balanceEur: number
}

export type LedgerSummary = {
  transaction_count: number
  realized_total_eur: number
  realized_by_position: { position_id: string; realized_eur: number }[]
  cash_accounts: CashAccountSummary[]
}

export type LedgerSummaryResponse = Omit<LedgerSummary, 'cash_accounts'> & {
  cash_accounts: (CashAccount & { balance: number; balance_eur: number })[]
}

export function normalizeLedgerSummary(response: LedgerSummaryResponse): LedgerSummary {
  return {
    transaction_count: Number(response.transaction_count),
    realized_total_eur: Number(response.realized_total_eur),
    realized_by_position: response.realized_by_position.map((item) => ({
      position_id: item.position_id,
      realized_eur: Number(item.realized_eur),
    })),
    cash_accounts: response.cash_accounts.map(({ balance_eur, ...account }) => ({
      ...account,
      balance: Number(account.balance),
      balanceEur: Number(balance_eur),
    })),
  }
}

export type PositionReturn = {
  positionId: string
  realizedEur: number
  unrealizedEur: number | null
  totalPnlEur: number | null
  open: boolean
  tracked: boolean
}

export function summarizeCashAccounts(accounts: CashAccount[], transactions: LedgerTransaction[]): CashAccountSummary[] {
  return accounts.map((account) => {
    const balance = transactions
      .filter((transaction) => transaction.cash_account_id === account.id)
      .reduce((sum, transaction) => sum + Number(transaction.cash_amount), 0)
    return {
      ...account,
      balance,
      balanceEur: balance * Number(account.current_fx_rate_to_eur),
    }
  })
}

export function summarizePositionReturns(
  positions: LedgerPosition[],
  transactions: LedgerTransaction[],
  valuationByPosition: Map<string, number | null>,
  realizedByPosition?: Map<string, number>,
): PositionReturn[] {
  return positions.map((position) => {
    const realizedEur = realizedByPosition?.get(position.id) ?? transactions
      .filter((transaction) => transaction.position_id === position.id)
      .reduce((sum, transaction) => sum + Number(transaction.realized_pnl_eur), 0)
    const tracked = Boolean(position.ledger_started_at)
    const currentValue = valuationByPosition.get(position.id) ?? null
    const unrealizedEur = tracked && currentValue !== null && position.cost_basis_eur !== null
      ? currentValue - Number(position.cost_basis_eur)
      : null
    return {
      positionId: position.id,
      realizedEur,
      unrealizedEur,
      totalPnlEur: unrealizedEur === null ? null : realizedEur + unrealizedEur,
      open: Number(position.quantity) > 0,
      tracked,
    }
  })
}

export function calculateSale(quantity: number, unitPrice: number, fees: number, fxRateToEur: number, positionQuantity: number, costBasisEur: number) {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > positionQuantity) throw new Error('La cantidad vendida debe ser mayor que cero y no superar la posición.')
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('El precio de venta debe ser mayor que cero.')
  if (!Number.isFinite(fees) || fees < 0 || fees > quantity * unitPrice) throw new Error('Revisa la comisión: debe ser válida y no superar el importe bruto.')
  if (!Number.isFinite(fxRateToEur) || fxRateToEur <= 0) throw new Error('El cambio EUR por unidad debe ser mayor que cero.')
  if (!Number.isFinite(positionQuantity) || positionQuantity <= 0 || !Number.isFinite(costBasisEur) || costBasisEur < 0) throw new Error('Esta posición no tiene un saldo inicial válido en el ledger.')

  const proceeds = quantity * unitPrice - fees
  const releasedCostBasisEur = costBasisEur * quantity / positionQuantity
  return {
    cashProceeds: proceeds,
    releasedCostBasisEur,
    realizedPnlEur: proceeds * fxRateToEur - releasedCostBasisEur,
    quantityRemaining: positionQuantity - quantity,
  }
}
