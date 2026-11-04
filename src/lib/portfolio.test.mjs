import assert from 'node:assert/strict'
import test from 'node:test'
import { getNextContributionDate } from './contributionPlans.ts'
import { prepareHistoricalSnapshot } from './historicalSnapshot.ts'
import { calculateSale, filterLedgerTransactions, summarizeCashAccounts, summarizePositionReturns } from './ledger.ts'

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
