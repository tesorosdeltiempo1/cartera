import assert from 'node:assert/strict'
import test from 'node:test'
import { getNextContributionDate } from './contributionPlans.ts'
import { fetchAllRows, validateBackupJson } from './backup.ts'
import { compareSnapshotValues, prepareHistoricalSnapshot } from './historicalSnapshot.ts'
import { calculateSale, filterLedgerTransactions, summarizeCashAccounts, summarizePositionReturns } from './ledger.ts'
import { getEstimateAgeDays, getPositionOverviewValuation, isEstimateDueForReview } from './valuation.ts'

const today = (date) => new Date(`${date}T12:00:00Z`)

test('weekly schedules use the next matching weekday and honor start and end dates', () => {
  const schedule = {
    cadence: 'weekly',
    start_date: '2026-03-05',
    end_date: '2026-03-16',
    weekday: 1,
    day_of_month: null,
  }

  assert.equal(getNextContributionDate(schedule, today('2026-03-04')), '2026-03-09')
  assert.equal(getNextContributionDate(schedule, today('2026-03-09')), '2026-03-09')
  assert.equal(getNextContributionDate(schedule, today('2026-03-10')), '2026-03-16')
  assert.equal(getNextContributionDate(schedule, today('2026-03-17')), null)
})

test('monthly schedules clamp short months and preserve leap years', () => {
  const schedule = {
    cadence: 'monthly',
    start_date: '2026-01-31',
    end_date: null,
    weekday: null,
    day_of_month: 31,
  }

  assert.equal(getNextContributionDate(schedule, today('2026-02-01')), '2026-02-28')
  assert.equal(getNextContributionDate(schedule, today('2028-02-01')), '2028-02-29')
  assert.equal(getNextContributionDate(schedule, today('2026-02-28')), '2026-02-28')
})

test('invalid contribution schedules do not produce fabricated dates', () => {
  const base = {
    cadence: 'monthly',
    start_date: '2026-01-01',
    end_date: null,
    weekday: null,
    day_of_month: 15,
  }

  assert.equal(getNextContributionDate({ ...base, start_date: '2026-02-30' }, today('2026-02-01')), null)
  assert.equal(getNextContributionDate({ ...base, end_date: '2025-12-31' }, today('2026-02-01')), null)
  assert.equal(getNextContributionDate({ ...base, day_of_month: 32 }, today('2026-02-01')), null)
  assert.equal(getNextContributionDate({ ...base, cadence: 'yearly' }, today('2026-02-01')), null)
})

test('sale calculation releases proportional cost basis and rejects invalid input', () => {
  const result = calculateSale(2, 60, 2, 0.9, 10, 500)
  assert.equal(result.cashProceeds, 118)
  assert.equal(result.releasedCostBasisEur, 100)
  assert.ok(Math.abs(result.realizedPnlEur - 6.2) < 1e-10)
  assert.equal(result.quantityRemaining, 8)
  assert.throws(() => calculateSale(11, 60, 0, 1, 10, 500), /no superar la posición/)
  assert.throws(() => calculateSale(1, 60, 61, 1, 10, 500), /comisión/)
})

test('cash totals include signed movements and use each account conversion', () => {
  const accounts = [
    { id: 'eur', broker: 'Banco A', currency: 'EUR', current_fx_rate_to_eur: 1, fx_as_of: null, fx_source: null },
    { id: 'usd', broker: 'Banco B', currency: 'USD', current_fx_rate_to_eur: 0.9, fx_as_of: '2026-03-01', fx_source: 'Banco' },
  ]
  const transactions = [
    { cash_account_id: 'eur', cash_amount: 100 },
    { cash_account_id: 'eur', cash_amount: -25 },
    { cash_account_id: 'usd', cash_amount: 50 },
  ]

  assert.deepEqual(summarizeCashAccounts(accounts, transactions).map(({ balance, balanceEur }) => [balance, balanceEur]), [
    [75, 75],
    [50, 45],
  ])
})

test('position returns distinguish untracked positions and missing valuations', () => {
  const positions = [
    { id: 'tracked', quantity: 3, cost_basis_eur: 90, ledger_started_at: '2026-01-01' },
    { id: 'untracked', quantity: 1, cost_basis_eur: null, ledger_started_at: null },
  ]

  assert.deepEqual(summarizePositionReturns(positions, [], new Map([['tracked', 120], ['untracked', 40]]), new Map([['tracked', 5]])).map((item) => ({
    positionId: item.positionId,
    realizedEur: item.realizedEur,
    unrealizedEur: item.unrealizedEur,
    totalPnlEur: item.totalPnlEur,
    tracked: item.tracked,
  })), [
    { positionId: 'tracked', realizedEur: 5, unrealizedEur: 30, totalPnlEur: 35, tracked: true },
    { positionId: 'untracked', realizedEur: 0, unrealizedEur: null, totalPnlEur: null, tracked: false },
  ])
})

test('recent transaction filtering matches localized labels and associated positions', () => {
  const transactions = [
    { id: '1', broker: 'Banco Norte', position_id: 'p1', operation_type: 'deposit', notes: 'Aportación marzo' },
    { id: '2', broker: 'Broker Sur', position_id: null, operation_type: 'transfer_out', notes: 'Rebalanceo' },
    { id: '3', broker: 'Broker Sur', position_id: 'p2', operation_type: 'buy', notes: null },
  ]
  const positions = new Map([['p1', 'Fondo global'], ['p2', 'Acciones Europa']])
  const labels = { deposit: 'Ingreso', transfer_out: 'Traspaso enviado', buy: 'Compra' }

  assert.deepEqual(filterLedgerTransactions(transactions, '  FONDO GLOBAL ', 'all', positions, labels).map(({ id }) => id), ['1'])
  assert.deepEqual(filterLedgerTransactions(transactions, 'aportacion', 'all', positions, labels).map(({ id }) => id), ['1'])
  assert.deepEqual(filterLedgerTransactions(transactions, 'traspaso', 'transfer_out', positions, labels).map(({ id }) => id), ['2'])
  assert.deepEqual(filterLedgerTransactions(transactions, '', 'buy', positions, labels).map(({ id }) => id), ['3'])
  assert.deepEqual(filterLedgerTransactions(transactions, 'no existe', 'all', positions, labels), [])
})

test('historical aggregate snapshots validate dates, unique brokers, and localized euro amounts', () => {
  const snapshot = prepareHistoricalSnapshot('2026-10-22', [
    { broker: 'Trade Republic', amount: '6.391,76' },
    { broker: 'XTB', amount: '2.272' },
    { broker: 'eToro', amount: '590' },
    { broker: 'Cold wallet', amount: '551' },
  ], '2026-11-04')

  assert.equal(snapshot.totalValue, 9804.76)
  assert.deepEqual(snapshot.breakdown, {
    'Trade Republic': 6391.76,
    XTB: 2272,
    eToro: 590,
    'Cold wallet': 551,
  })
  assert.throws(() => prepareHistoricalSnapshot('2026-02-30', [{ broker: 'Broker', amount: '10' }], '2026-11-04'), /fecha válida/)
  assert.throws(() => prepareHistoricalSnapshot('2026-11-05', [{ broker: 'Broker', amount: '10' }], '2026-11-04'), /futuro/)
  assert.throws(() => prepareHistoricalSnapshot('2026-10-22', [
    { broker: 'Broker', amount: '10' },
    { broker: ' broker ', amount: '20' },
  ], '2026-11-04'), /más de una vez/)
  assert.throws(() => prepareHistoricalSnapshot('2026-10-22', [{ broker: 'Broker', amount: '-1' }], '2026-11-04'), /importe válido/)
})

test('historical snapshot comparisons show nominal changes and avoid invalid baselines', () => {
  assert.deepEqual(compareSnapshotValues(1100, 1000), { difference: 100, percentage: 10 })
  assert.deepEqual(compareSnapshotValues(950, 1000), { difference: -50, percentage: -5 })
  assert.equal(compareSnapshotValues(1000, 0), null)
  assert.equal(compareSnapshotValues(Number.NaN, 1000), null)
})

test('overview valuation prefers confirmed quotes and otherwise uses a direct EUR estimate', () => {
  const estimate = {
    quantity: 3,
    avg_price: null,
    current_price: null,
    currency: null,
    price_as_of: null,
    price_source: null,
    fx_rate_to_eur: null,
    fx_as_of: null,
    fx_source: null,
    estimated_value_eur: 250,
    estimated_value_as_of: '2026-11-05',
  }

  assert.deepEqual(getPositionOverviewValuation(estimate), {
    quality: 'estimated',
    valueEur: 250,
    asOf: '2026-11-05',
    reason: null,
  })
  assert.equal(getPositionOverviewValuation({ ...estimate, estimated_value_eur: -1 }).quality, 'missing')
  assert.deepEqual(getPositionOverviewValuation({
    ...estimate,
    currency: 'EUR',
    current_price: 100,
    price_as_of: '2026-11-04',
    price_source: 'Broker',
  }), {
    quality: 'confirmed',
    valueEur: 300,
    asOf: '2026-11-04',
    reason: null,
  })
})

test('estimate review age uses calendar days and keeps missing or future dates reviewable', () => {
  const todayDate = '2026-11-05'
  assert.equal(getEstimateAgeDays('2026-11-05', todayDate), 0)
  assert.equal(getEstimateAgeDays('2026-08-07', todayDate), 90)
  assert.equal(getEstimateAgeDays('2026-08-06', todayDate), 91)
  assert.equal(isEstimateDueForReview('2026-08-07', todayDate), false)
  assert.equal(isEstimateDueForReview('2026-08-06', todayDate), true)
  assert.equal(getEstimateAgeDays('2026-11-06', todayDate), null)
  assert.equal(getEstimateAgeDays('2026-02-30', todayDate), null)
  assert.equal(isEstimateDueForReview(null, todayDate), true)
})

test('backup pagination exports every row and requires a stable exact count', async () => {
  const rows = Array.from({ length: 501 }, (_, index) => index)
  const requestedPages = []
  const exported = await fetchAllRows(async (from, to) => {
    requestedPages.push([from, to])
    return { data: rows.slice(from, to + 1), count: rows.length, error: null }
  })

  assert.deepEqual(requestedPages, [[0, 499], [500, 999]])
  assert.deepEqual(exported, rows)
})

test('backup pagination rejects missing counts, missing data, changed totals, and partial results', async () => {
  await assert.rejects(fetchAllRows(async () => ({ data: [], count: null, error: null })), /verificar el total/)
  await assert.rejects(fetchAllRows(async () => ({ data: null, count: 0, error: null })), /No se recibieron filas/)
  await assert.rejects(fetchAllRows(async (from) => ({
    data: from === 0 ? Array.from({ length: 500 }, (_, index) => index) : [500],
    count: from === 0 ? 501 : 502,
    error: null,
  })), /cambiaron durante la exportación/)
  await assert.rejects(fetchAllRows(async () => ({ data: [], count: 1, error: null })), /respaldo parcial/)
})

function backupId(index) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
}

test('backup validation accepts a complete version 7 archive with linked rows', () => {
  const backup = {
    app: 'Cartera',
    formatVersion: 7,
    exportedAt: '2026-11-06T12:00:00.000Z',
    tables: {
      assets: [{ id: backupId(1), investment_asset_id: backupId(2) }],
      investment_assets: [{ id: backupId(2) }],
      portfolio_snapshots: [{ id: backupId(3) }],
      portfolio_snapshot_assets: [{ id: backupId(4), snapshot_id: backupId(3), investment_asset_id: backupId(2) }],
      portfolio_cash_accounts: [{ id: backupId(5) }],
      portfolio_transactions: [{ id: backupId(6), cash_account_id: backupId(5), position_id: backupId(1) }],
      real_estate_assets: [{ id: backupId(7) }],
      mortgage_liabilities: [{ id: backupId(8), property_id: backupId(7) }],
      wealth_snapshots: [{ id: backupId(9) }],
      portfolio_contribution_plans: [{ id: backupId(10), target_position_id: backupId(1) }],
    },
  }

  const result = validateBackupJson(JSON.stringify(backup))
  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, [])
  assert.equal(result.counts.assets, 1)
  assert.equal(result.counts.portfolio_transactions, 1)
  assert.equal(result.exportedAt, backup.exportedAt)
})

test('backup validation reports unsupported, incomplete, duplicate, and broken-reference data', () => {
  assert.match(validateBackupJson('{').errors[0], /JSON válido/)

  const backup = {
    app: 'Cartera',
    formatVersion: 6,
    exportedAt: '2026-11-06T12:00:00.000Z',
    tables: Object.fromEntries([
      'assets',
      'investment_assets',
      'portfolio_snapshots',
      'portfolio_snapshot_assets',
      'portfolio_cash_accounts',
      'portfolio_transactions',
      'real_estate_assets',
      'mortgage_liabilities',
      'wealth_snapshots',
      'portfolio_contribution_plans',
    ].map((table) => [table, []])),
  }
  backup.tables.assets = [{ id: backupId(1) }, { id: backupId(1) }]
  backup.tables.portfolio_transactions = [{ id: backupId(2), cash_account_id: '00000000-0000-4000-8000-000000000099' }]

  const result = validateBackupJson(JSON.stringify(backup))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => /no compatible/.test(error)))
  assert.ok(result.errors.some((error) => /identificador duplicado/.test(error)))
  assert.ok(result.errors.some((error) => /cash_account_id/.test(error)))

  delete backup.tables.wealth_snapshots
  assert.ok(validateBackupJson(JSON.stringify(backup)).errors.some((error) => /Falta la tabla wealth_snapshots/.test(error)))
})
