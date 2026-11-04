'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import RecordOperationForm from '@/components/RecordOperationForm'
import StartLedgerButton from '@/components/StartLedgerButton'
import CashTransferForm from '@/components/CashTransferForm'
import ContributionPlansPanel from '@/components/ContributionPlansPanel'
import ReverseTransactionButton from '@/components/ReverseTransactionButton'
import { supabase } from '@/lib/supabase'
import { formatCurrency, getPositionValuation } from '@/lib/valuation'
import { filterLedgerTransactions, normalizeLedgerSummary, summarizePositionReturns, type LedgerPosition, type LedgerSummary, type LedgerSummaryResponse, type LedgerTransaction } from '@/lib/ledger'

type Position = LedgerPosition & {
  ticker: string | null
  category: string
  target_weight: number | null
  investment_asset_id: string | null
}

const OPERATION_LABELS: Record<string, string> = {
  opening_position: 'Saldo inicial de posición',
  opening_cash: 'Saldo inicial de efectivo',
  buy: 'Compra',
  sell: 'Venta',
  reversal: 'Reversión auditada',
  deposit: 'Ingreso',
  withdrawal: 'Retirada',
  dividend: 'Dividendo',
  interest: 'Interés',
  fee: 'Comisión',
  fx_update: 'Actualización de cambio',
  transfer_in: 'Traspaso recibido',
  transfer_out: 'Traspaso enviado',
  rental_income: 'Alquiler cobrado',
  property_expense: 'Gasto inmobiliario',
  mortgage_payment: 'Pago hipotecario',
}

function eur(value: number) {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

export default function OperacionesPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([])
  const [summary, setSummary] = useState<LedgerSummary>({ transaction_count: 0, realized_total_eur: 0, realized_by_position: [], cash_accounts: [] })
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [transactionSearch, setTransactionSearch] = useState('')
  const [transactionType, setTransactionType] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const [positionResult, summaryResult, transactionResult] = await Promise.all([
        supabase.from('assets').select('*').order('name').order('broker'),
        supabase.rpc('get_portfolio_ledger_summary'),
        supabase.from('portfolio_transactions').select('*').order('operation_date', { ascending: false }).order('created_at', { ascending: false }).limit(250),
      ])
      const failure = positionResult.error ?? summaryResult.error ?? transactionResult.error
      if (failure) throw failure
      if (!summaryResult.data) throw new Error('No se recibió el resumen del ledger.')
      setPositions((positionResult.data ?? []) as Position[])
      setSummary(normalizeLedgerSummary(summaryResult.data as LedgerSummaryResponse))
      setTransactions((transactionResult.data ?? []) as LedgerTransaction[])
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar operaciones y efectivo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const refresh = () => window.setTimeout(() => void load(), 0)
    refresh()
    window.addEventListener('portfolio:changed', refresh)
    return () => window.removeEventListener('portfolio:changed', refresh)
  }, [load])

  const cash = summary.cash_accounts
  const reversedTransactionIds = new Set(transactions.map((transaction) => transaction.reversal_of_transaction_id).filter((id): id is string => Boolean(id)))
  const positionNames = useMemo(() => new Map(positions.map((position) => [position.id, position.name])), [positions])
  const filteredTransactions = useMemo(
    () => filterLedgerTransactions(transactions, transactionSearch, transactionType, positionNames, OPERATION_LABELS),
    [positionNames, transactionSearch, transactionType, transactions],
  )
  const transactionTypes = Array.from(new Set(transactions.map((transaction) => transaction.operation_type))).sort()
  const returns = useMemo(() => summarizePositionReturns(
    positions,
    transactions,
    new Map(positions.map((position) => [position.id, getPositionValuation(position).valueEur])),
    new Map(summary.realized_by_position.map((item) => [item.position_id, item.realized_eur])),
  ), [positions, transactions, summary.realized_by_position])
  const trackedPositionIds = useMemo(() => new Set(positions.filter((position) => position.ledger_started_at).map((position) => position.id)), [positions])
  const realized = summary.realized_total_eur
  const unrealized = returns.filter((item) => item.tracked).reduce((sum, item) => sum + (item.unrealizedEur ?? 0), 0)
  const cashTotalEur = cash.reduce((sum, account) => sum + account.balanceEur, 0)

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <header className="mb-7">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Libro patrimonial</p>
        <h1 className="text-3xl text-white sm:text-4xl">Operaciones y efectivo</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Registra el movimiento cuando ocurre. Cada compra o venta modifica posición y caja de forma atómica; las rentabilidades empiezan desde el saldo inicial que confirmes.</p>
      </header>

      {errorMessage && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">
        <p>{errorMessage}</p>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border border-rose-200/20 px-3 py-1.5 font-medium hover:bg-rose-200/10 disabled:opacity-50">Reintentar</button>
      </div>}

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"><p className="text-sm text-slate-400">Caja actual estimada en EUR</p><p className="mt-2 text-2xl text-white">{eur(cashTotalEur)}</p><p className="mt-1 text-xs text-slate-500">Las aportaciones y retiradas no son ganancia.</p></article>
        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"><p className="text-sm text-slate-400">Resultado realizado</p><p className={`mt-2 text-2xl ${realized >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>{eur(realized)}</p><p className="mt-1 text-xs text-slate-500">Ventas, rentas y comisiones registradas.</p></article>
        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"><p className="text-sm text-slate-400">Resultado no realizado</p><p className={`mt-2 text-2xl ${unrealized >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>{eur(unrealized)}</p><p className="mt-1 text-xs text-slate-500">Posiciones con ledger y precio/cambio confirmados.</p></article>
      </section>

      <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6">
        <h2 className="mb-1 text-lg text-white">Saldos de efectivo por cuenta</h2>
        <p className="mb-4 text-sm text-slate-400">Se derivan del historial de caja. No edites saldos directamente; registra ingreso, retirada o movimiento.</p>
        {loading ? <p className="text-sm text-slate-400">Cargando saldos…</p> : cash.length === 0 ? <p className="text-sm text-slate-400">Todavía no hay caja registrada. Añade un saldo inicial o registra el primer movimiento.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cash.map((account) => <article key={account.id} className="rounded-xl border border-teal-300/15 bg-black/10 p-4">
              <p className="font-medium text-slate-100">{account.broker}</p>
              <p className="mt-1 text-sm text-slate-400">{account.currency} · cambio {Number(account.current_fx_rate_to_eur).toLocaleString('es-ES', { maximumSignificantDigits: 8 })} EUR/{account.currency}{account.fx_as_of ? ` · ${account.fx_as_of}` : ''}</p>
              <p className="mt-3 text-xl tabular-nums text-white">{formatCurrency(account.balance, account.currency)}</p>
              <p className="mt-1 text-sm text-teal-100">≈ {eur(account.balanceEur)}</p>
            </article>)}
          </div>
        )}
      </section>

      <section className="mb-6">
        <details className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6">
          <summary className="cursor-pointer text-sm font-medium text-teal-100">Traspasar dinero entre cuentas</summary>
          <CashTransferForm accounts={cash} onSaved={() => void load()} />
        </details>
      </section>

      <ContributionPlansPanel positions={positions} cashAccounts={cash} />

      <section className="mb-6">
        <RecordOperationForm positions={positions} trackedPositionIds={trackedPositionIds} cashAccounts={cash} />
      </section>

      <section className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
        <div className="border-b border-white/10 px-4 py-4 sm:px-6"><h2 className="text-lg text-white">Posiciones y punto de partida</h2><p className="mt-1 text-sm text-slate-400">Inicia el ledger por posición para medir resultados desde hoy. No inventa compras anteriores.</p></div>
        {loading ? <p className="p-5 text-sm text-slate-400">Cargando posiciones…</p> : positions.length === 0 ? <p className="p-5 text-sm text-slate-400">No hay posiciones.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3">Posición</th><th className="px-4 py-3 text-right">Unidades actuales</th><th className="px-4 py-3 text-right">Coste base ledger</th><th className="px-4 py-3 text-right">Realizado</th><th className="px-4 py-3">Seguimiento</th></tr></thead>
          <tbody className="divide-y divide-white/[0.06]">{positions.map((position) => {
            const result = returns.find((item) => item.positionId === position.id)
            return <tr key={position.id}>
              <td className="px-4 py-3"><p className="font-medium text-slate-100">{position.name}</p><p className="text-xs text-slate-500">{position.broker ?? 'Broker sin indicar'} · {position.currency ?? 'moneda pendiente'}</p></td>
              <td className="px-4 py-3 text-right tabular-nums">{Number(position.quantity).toLocaleString('es-ES')}</td>
              <td className="px-4 py-3 text-right tabular-nums">{position.cost_basis_eur === null ? '—' : eur(Number(position.cost_basis_eur))}</td>
              <td className={`px-4 py-3 text-right tabular-nums ${(result?.realizedEur ?? 0) >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>{eur(result?.realizedEur ?? 0)}</td>
              <td className="px-4 py-3">{position.ledger_started_at ? <span className="text-emerald-200">Activo desde {new Date(position.ledger_started_at).toLocaleDateString('es-ES')}</span> : <StartLedgerButton position={position} />}</td>
            </tr>
          })}</tbody>
        </table></div>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
        <div className="border-b border-white/10 px-4 py-4 sm:px-6">
          <h2 className="text-lg text-white">Libro de operaciones</h2>
          <p className="mt-1 text-sm text-slate-400">Mostrando {transactions.length} más recientes de {summary.transaction_count} · las correcciones se registran como reversiones, no se borran</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.5fr)_auto]">
            <label className="grid gap-1.5 text-xs text-slate-400">Buscar en los movimientos recientes
              <input value={transactionSearch} onChange={(event) => setTransactionSearch(event.target.value)} placeholder="Broker, activo o nota" className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100" />
            </label>
            <label className="grid gap-1.5 text-xs text-slate-400">Tipo de operación
              <select value={transactionType} onChange={(event) => setTransactionType(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100">
                <option value="all">Todos los tipos</option>
                {transactionTypes.map((type) => <option key={type} value={type}>{OPERATION_LABELS[type] ?? type}</option>)}
              </select>
            </label>
            <div className="flex items-end">
              <button type="button" onClick={() => { setTransactionSearch(''); setTransactionType('all') }} disabled={!transactionSearch && transactionType === 'all'} className="rounded-lg border border-white/10 px-3 py-2.5 text-xs text-slate-300 hover:border-teal-300/30 hover:text-teal-100 disabled:cursor-not-allowed disabled:opacity-40">Limpiar filtros</button>
            </div>
          </div>
          <p aria-live="polite" className="mt-2 text-xs text-slate-500">{filteredTransactions.length} movimientos coinciden; la búsqueda se limita a los 250 más recientes.</p>
        </div>
        {loading ? <p className="p-5 text-sm text-slate-400">Cargando operaciones…</p> : transactions.length === 0 ? <p className="p-5 text-sm text-slate-400">Las operaciones registradas aparecerán aquí. No se crea historial ficticio.</p> : filteredTransactions.length === 0 ? <p className="p-5 text-sm text-slate-400">No hay movimientos recientes que coincidan. Prueba otra búsqueda o limpia los filtros.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Operación</th><th className="px-4 py-3">Activo / cuenta</th><th className="px-4 py-3 text-right">Unidades / importe</th><th className="px-4 py-3 text-right">Realizado EUR</th><th className="px-4 py-3">Nota / corrección</th><th className="px-4 py-3">Acción</th></tr></thead>
          <tbody className="divide-y divide-white/[0.06]">{filteredTransactions.map((transaction) => <tr key={transaction.id}>
            <td className="px-4 py-3 text-slate-300">{new Date(`${transaction.operation_date}T00:00:00`).toLocaleDateString('es-ES')}</td>
            <td className="px-4 py-3 text-slate-100">{OPERATION_LABELS[transaction.operation_type] ?? transaction.operation_type}</td>
            <td className="px-4 py-3"><span className="text-slate-200">{transaction.broker}</span>{transaction.position_id && <span className="block text-xs text-slate-500">{positions.find((position) => position.id === transaction.position_id)?.name ?? 'Posición'}</span>}</td>
            <td className="px-4 py-3 text-right tabular-nums text-slate-300">{transaction.quantity !== null ? `${Number(transaction.quantity).toLocaleString('es-ES')} × ${formatCurrency(Number(transaction.unit_price), transaction.currency)}` : formatCurrency(Number(transaction.cash_amount), transaction.currency)}</td>
            <td className={`px-4 py-3 text-right tabular-nums ${Number(transaction.realized_pnl_eur) >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>{eur(Number(transaction.realized_pnl_eur))}</td>
            <td className="px-4 py-3 text-xs text-slate-400">{transaction.notes ?? (transaction.reversal_of_transaction_id ? `Corrige ${transaction.reversal_of_transaction_id.slice(0, 8)}` : '—')}</td>
            <td className="px-4 py-3"><ReverseTransactionButton
              transactionId={transaction.id}
              operationType={transaction.operation_type}
              reversalOfId={transaction.reversal_of_transaction_id}
              alreadyReversed={reversedTransactionIds.has(transaction.id)}
              onReversed={() => void load()}
            /></td>
          </tr>)}</tbody>
        </table></div>}
      </section>
    </main>
  )
}
