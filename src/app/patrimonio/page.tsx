'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MortgageForm, RealEstateForm } from '@/components/RealEstateForms'
import PropertyCashFlowForm from '@/components/PropertyCashFlowForm'
import SaveWealthSnapshotButton from '@/components/SaveWealthSnapshotButton'
import TrackRecordChart from '@/components/TrackRecordChart'
import { notifyPortfolioChanged } from '@/lib/portfolioEvents'
import { supabase } from '@/lib/supabase'
import { formatCurrency, getPositionValuation, type PositionPriceData } from '@/lib/valuation'
import { normalizeLedgerSummary, type LedgerSummary, type LedgerSummaryResponse } from '@/lib/ledger'
import { getMortgageValuation, getPropertyValuation, summarizeWealth, type MortgageLiability, type RealEstateAsset, type WealthSnapshot } from '@/lib/wealth'

type PropertyType = RealEstateAsset['property_type']
type PropertyCashFlow = {
  id: string
  property_id: string
  mortgage_id: string | null
  operation_type: 'rental_income' | 'property_expense' | 'mortgage_payment'
  operation_date: string
  amount: number | null
  principal_amount: number
  currency: string
  flow_category: string | null
  notes: string | null
}

const propertyTypeLabels: Record<PropertyType, string> = {
  home: 'Vivienda',
  rental: 'Vivienda alquilada',
  land: 'Terreno',
  other: 'Otro inmueble',
}
const cashFlowLabels: Record<PropertyCashFlow['operation_type'], string> = {
  rental_income: 'Alquiler cobrado',
  property_expense: 'Gasto del inmueble',
  mortgage_payment: 'Pago hipotecario',
}
const expenseCategoryLabels: Record<string, string> = {
  maintenance: 'Mantenimiento',
  tax: 'Impuestos',
  insurance: 'Seguro',
  community: 'Comunidad',
  other: 'Otro gasto',
}

function eur(value: number) {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatFx(currency: string, rate: number | string | null, date: string | null, source: string | null) {
  if (currency === 'EUR') return null
  return `${Number(rate).toLocaleString('es-ES', { maximumSignificantDigits: 8 })} EUR/${currency} · ${date ? formatDate(date) : 'fecha pendiente'}${source ? ` · ${source}` : ''}`
}

export default function PatrimonioPage() {
  const [positions, setPositions] = useState<PositionPriceData[]>([])
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummary>({ transaction_count: 0, realized_total_eur: 0, realized_by_position: [], cash_accounts: [] })
  const [properties, setProperties] = useState<RealEstateAsset[]>([])
  const [mortgages, setMortgages] = useState<MortgageLiability[]>([])
  const [propertyCashFlows, setPropertyCashFlows] = useState<PropertyCashFlow[]>([])
  const [snapshots, setSnapshots] = useState<WealthSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [editingProperty, setEditingProperty] = useState<RealEstateAsset | null>(null)
  const [editingMortgage, setEditingMortgage] = useState<MortgageLiability | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [positionsResult, summaryResult, propertiesResult, mortgagesResult, cashFlowsResult, snapshotsResult] = await Promise.all([
        supabase.from('assets').select('quantity,current_price,currency,price_as_of,price_source,fx_rate_to_eur,fx_as_of,fx_source'),
        supabase.rpc('get_portfolio_ledger_summary'),
        supabase.from('real_estate_assets').select('*').order('name'),
        supabase.from('mortgage_liabilities').select('*').order('name'),
        supabase.from('portfolio_transactions').select('*').not('property_id', 'is', null).order('operation_date', { ascending: false }).order('created_at', { ascending: false }).limit(100),
        supabase.from('wealth_snapshots').select('*').order('snapshot_date', { ascending: false }),
      ])
      const failed = positionsResult.error ?? summaryResult.error ?? propertiesResult.error ?? mortgagesResult.error ?? cashFlowsResult.error ?? snapshotsResult.error
      if (failed) throw failed
      if (!summaryResult.data) throw new Error('No se recibió el resumen de caja.')
      setPositions((positionsResult.data ?? []) as PositionPriceData[])
      setLedgerSummary(normalizeLedgerSummary(summaryResult.data as LedgerSummaryResponse))
      setProperties((propertiesResult.data ?? []) as RealEstateAsset[])
      setMortgages((mortgagesResult.data ?? []) as MortgageLiability[])
      setPropertyCashFlows((cashFlowsResult.data ?? []) as PropertyCashFlow[])
      setSnapshots((snapshotsResult.data ?? []) as WealthSnapshot[])
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar el balance patrimonial.')
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

  const propertyById = useMemo(() => new Map(properties.map((property) => [property.id, property])), [properties])
  const propertyValuations = properties.map((property) => getPropertyValuation(property))
  const mortgageValuations = mortgages.map((mortgage) => getMortgageValuation(mortgage))
  const financialAssetTotal = positions.reduce((sum, position) => sum + (getPositionValuation(position).valueEur ?? 0), 0)
  const financialIncompleteCount = positions.filter((position) => !getPositionValuation(position).complete).length
  const cashTotalEur = ledgerSummary.cash_accounts.reduce((sum, account) => sum + account.balanceEur, 0)
  const propertiesValueEur = propertyValuations.map((valuation) => valuation.valueEur ?? 0)
  const mortgageDebtEur = mortgageValuations.map((valuation) => valuation.valueEur ?? 0)
  const totals = summarizeWealth(financialAssetTotal, cashTotalEur, propertiesValueEur, mortgageDebtEur)
  const debtReviewPending = properties.filter((property) =>
    property.mortgage_status === 'unreviewed'
      || (property.mortgage_status === 'registered' && !mortgages.some((mortgage) => mortgage.property_id === property.id)),
  )
  const incompletePropertyCount = propertyValuations.filter((valuation) => !valuation.complete).length
  const incompleteMortgageCount = mortgageValuations.filter((valuation) => !valuation.complete).length
  const snapshotReady = !loading
    && !errorMessage
    && financialIncompleteCount === 0
    && incompletePropertyCount === 0
    && incompleteMortgageCount === 0
    && debtReviewPending.length === 0
  const historyData = [...snapshots].reverse().map((snapshot) => ({
    snapshot_date: snapshot.snapshot_date,
    total_value: Number(snapshot.net_worth_eur),
  }))

  async function confirmNoMortgage(property: RealEstateAsset) {
    setActionError('')
    try {
      const { error } = await supabase.rpc('confirm_property_has_no_mortgage', { p_property_id: property.id })
      if (error) throw error
      await load()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo actualizar el estado de la hipoteca.')
    }
  }

  function refreshAfterSave() {
    setEditingProperty(null)
    setEditingMortgage(null)
    void load()
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <header className="mb-7">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Balance familiar</p>
        <h1 className="text-2xl font-semibold text-white">Patrimonio registrado</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Inversiones, efectivo, inmuebles y deuda declarados. No incluye activos ni obligaciones que todavía no hayas registrado.</p>
      </header>

      {errorMessage && <p role="alert" className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">No se pudo cargar el balance: {errorMessage}</p>}
      {actionError && <p role="alert" className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{actionError}</p>}

      <section className="mb-6 grid gap-5 border-y border-teal-300/15 py-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{snapshotReady ? 'Patrimonio neto estimado' : 'Subtotal · faltan datos'}</p>
          <p className="mt-2 text-4xl font-semibold tabular-nums text-white">{loading ? 'Cargando…' : eur(totals.netWorthEur)}</p>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Valor atribuible de inmuebles más cartera y efectivo, menos saldos hipotecarios atribuibles. Las valoraciones pendientes no se suman.</p>
        </div>
        <SaveWealthSnapshotButton
          disabled={loading || !snapshotReady || Boolean(errorMessage)}
          onSaved={() => void load()}
        />
      </section>

      {(financialIncompleteCount > 0 || incompletePropertyCount > 0 || incompleteMortgageCount > 0 || debtReviewPending.length > 0) && (
        <section role="status" className="mb-6 border-l-2 border-amber-300/60 bg-amber-300/[0.06] px-4 py-3 text-sm leading-6 text-amber-100">
          <p>Completa los datos pendientes para guardar un corte patrimonial verificable.</p>
          {financialIncompleteCount > 0 && <p>{financialIncompleteCount} posiciones financieras necesitan confirmar su valoración.</p>}
          {incompletePropertyCount > 0 && <p>{incompletePropertyCount} inmuebles necesitan una valoración completa.</p>}
          {debtReviewPending.length > 0 && <p>{debtReviewPending.length} inmuebles necesitan indicar si tienen hipoteca.</p>}
          {incompleteMortgageCount > 0 && <p>{incompleteMortgageCount} hipotecas necesitan confirmar saldo, moneda y procedencia.</p>}
        </section>
      )}

      <section aria-label="Desglose patrimonial registrado" className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Inversiones', totals.financialAssetsEur],
          ['Efectivo', totals.cashEur],
          ['Inmuebles · parte propia', totals.realEstateEur],
          ['Hipotecas · parte propia', -totals.mortgageDebtEur],
        ].map(([label, value]) => (
          <article key={label} className="border-b border-white/10 py-3">
            <p className="text-sm text-slate-400">{label}</p>
            <p className={`mt-2 text-xl font-medium tabular-nums ${Number(value) < 0 ? 'text-amber-100' : 'text-slate-100'}`}>{eur(Number(value))}</p>
          </article>
        ))}
      </section>

      <section className="mb-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-200">Activos inmobiliarios</p>
            <h2 className="mt-1 text-lg text-white">Inmuebles</h2>
          </div>
          <span className="text-xs text-slate-500">{properties.length} registrados</span>
        </div>
        {loading ? <p className="py-6 text-sm text-slate-400">Cargando inmuebles…</p> : properties.length === 0 ? (
          <p className="py-6 text-sm text-slate-400">Todavía no hay inmuebles registrados.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {properties.map((property) => {
              const valuation = getPropertyValuation(property)
              const propertyMortgages = mortgages.filter((mortgage) => mortgage.property_id === property.id)
              const attributedValue = valuation.valueEur
              return (
                <article key={property.id} className="grid gap-4 py-5 lg:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="font-medium text-white">{property.name}</h3>
                      <span className="text-xs text-slate-500">{propertyTypeLabels[property.property_type] ?? property.property_type} · {Number(property.ownership_percentage).toLocaleString('es-ES')}% de propiedad</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{formatCurrency(Number(property.current_value), property.currency)} · valoración {formatDate(property.valuation_as_of)} · {property.valuation_source}</p>
                    {formatFx(property.currency, property.fx_rate_to_eur, property.fx_as_of, property.fx_source) && <p className="mt-1 text-xs text-slate-500">Cambio: {formatFx(property.currency, property.fx_rate_to_eur, property.fx_as_of, property.fx_source)}</p>}
                    <p className="mt-1 text-sm text-teal-100">Parte atribuible: {attributedValue === null ? 'Pendiente' : eur(attributedValue)}</p>
                    {!valuation.complete && <p className="mt-1 text-xs text-amber-200">{valuation.reason}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      {property.mortgage_status === 'none' ? <span className="text-slate-400">Sin hipoteca declarada</span> : property.mortgage_status === 'registered' && propertyMortgages.length > 0 ? <span className="text-slate-400">{propertyMortgages.length} {propertyMortgages.length === 1 ? 'hipoteca registrada' : 'hipotecas registradas'}</span> : <>
                        <span className="text-amber-200">Deuda pendiente de revisar</span>
                        <button type="button" onClick={() => void confirmNoMortgage(property)} className="rounded-md border border-white/10 px-2.5 py-1.5 text-slate-300 hover:border-teal-300/30 hover:text-teal-100">Confirmar que no tiene hipoteca</button>
                      </>}
                    </div>
                    {propertyMortgages.length > 0 && <ul className="mt-3 grid gap-2 border-l border-amber-300/25 pl-3">
                      {propertyMortgages.map((mortgage) => {
                        const mortgageValuation = getMortgageValuation(mortgage)
                        return <li key={mortgage.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="text-slate-300">{mortgage.name} · {formatCurrency(Number(mortgage.current_balance), mortgage.currency)}</span>
                          <span className="text-right text-slate-400">{mortgageValuation.valueEur === null ? mortgageValuation.reason : `${eur(mortgageValuation.valueEur)} atribuibles`}</span>
                        </li>
                      })}
                    </ul>}
                  </div>
                  <button type="button" onClick={() => setEditingProperty(property)} className="h-fit rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-teal-300/30 hover:text-teal-100">Editar valoración</button>
                </article>
              )
            })}
          </div>
        )}
        <details className="mt-4 border-t border-white/10 pt-4">
          <summary className="w-fit cursor-pointer text-sm font-medium text-teal-100">Añadir inmueble</summary>
          <div className="mt-4 max-w-5xl"><RealEstateForm onSaved={() => void load()} /></div>
        </details>
      </section>

      {properties.length > 0 && <section className="mb-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-200">Pasivos asociados</p>
            <h2 className="mt-1 text-lg text-white">Hipotecas</h2>
          </div>
          <span className="text-xs text-slate-500">{mortgages.length} registradas</span>
        </div>
        {mortgages.length > 0 && <div className="mb-4 divide-y divide-white/10">
          {mortgages.map((mortgage) => {
            const property = propertyById.get(mortgage.property_id)
            const valuation = getMortgageValuation(mortgage)
            return <article key={mortgage.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-slate-100">{mortgage.name} · {property?.name ?? 'Inmueble no encontrado'}</p>
                <p className="mt-1 text-xs text-slate-400">Saldo {formatCurrency(Number(mortgage.current_balance), mortgage.currency)} · {Number(mortgage.ownership_percentage).toLocaleString('es-ES')}% de deuda · actualizado {formatDate(mortgage.balance_as_of)} · {mortgage.balance_source}</p>
                {formatFx(mortgage.currency, mortgage.fx_rate_to_eur, mortgage.fx_as_of, mortgage.fx_source) && <p className="mt-1 text-xs text-slate-500">Cambio: {formatFx(mortgage.currency, mortgage.fx_rate_to_eur, mortgage.fx_as_of, mortgage.fx_source)}</p>}
                {valuation.valueEur !== null && <p className="mt-1 text-sm text-amber-100">{eur(valuation.valueEur)} atribuibles</p>}
              </div>
              <button type="button" onClick={() => setEditingMortgage(mortgage)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-teal-300/30 hover:text-teal-100">Actualizar saldo</button>
            </article>
          })}
        </div>}
        <details className="border-t border-white/10 pt-4">
          <summary className="w-fit cursor-pointer text-sm font-medium text-teal-100">Añadir hipoteca</summary>
          <div className="mt-4 max-w-5xl"><MortgageForm properties={properties} onSaved={() => void load()} /></div>
        </details>
      </section>}

      <section className="mb-8">
        <div className="mb-3 border-b border-white/10 pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-200">Caja inmobiliaria</p>
          <h2 className="mt-1 text-lg text-white">Alquileres, gastos y cuotas</h2>
          <p className="mt-1 text-sm text-slate-400">Los movimientos se suman a la caja existente. Solo el principal reduce la deuda; intereses y gastos no alteran la valoración del inmueble.</p>
        </div>
        {properties.length > 0 ? <details className="border-b border-white/10 pb-4">
          <summary className="w-fit cursor-pointer text-sm font-medium text-teal-100">Registrar movimiento</summary>
          <div className="mt-4">
            <PropertyCashFlowForm
              properties={properties}
              mortgages={mortgages}
              cashAccounts={ledgerSummary.cash_accounts}
              onSaved={() => notifyPortfolioChanged()}
            />
          </div>
        </details> : <p className="border-b border-white/10 py-4 text-sm text-slate-400">Añade un inmueble para registrar sus movimientos.</p>}
        {propertyCashFlows.length > 0 ? <div className="divide-y divide-white/10">
          {propertyCashFlows.slice(0, 12).map((flow) => {
            const amount = Number(flow.amount ?? 0)
            const principal = Number(flow.principal_amount)
            const interest = amount - principal
            const income = flow.operation_type === 'rental_income'
            return <article key={flow.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-slate-200">{cashFlowLabels[flow.operation_type]} · {propertyById.get(flow.property_id)?.name ?? 'Inmueble'}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(flow.operation_date)}{flow.flow_category ? ` · ${expenseCategoryLabels[flow.flow_category] ?? flow.flow_category}` : ''}{flow.notes ? ` · ${flow.notes}` : ''}</p>
                {flow.operation_type === 'mortgage_payment' && <p className="mt-1 text-xs text-slate-400">Principal {formatCurrency(principal, flow.currency)} · intereses {formatCurrency(interest, flow.currency)}</p>}
              </div>
              <p className={`tabular-nums text-sm ${income ? 'text-emerald-200' : 'text-amber-100'}`}>{income ? '+' : '−'}{formatCurrency(amount, flow.currency)}</p>
            </article>
          })}
        </div> : <p className="py-5 text-sm text-slate-400">Aún no hay movimientos inmobiliarios registrados.</p>}
      </section>

      <section className="mb-8">
        <div className="mb-3 border-b border-white/10 pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-200">Evolución</p>
          <h2 className="mt-1 text-lg text-white">Cortes de patrimonio</h2>
          <p className="mt-1 text-sm text-slate-400">Cada corte conserva los valores y saldos indicados ese día; no se recalcula al editar.</p>
        </div>
        {loading ? <p className="py-6 text-sm text-slate-400">Cargando cortes…</p> : historyData.length > 0 ? <TrackRecordChart data={historyData} /> : <p className="py-6 text-sm text-slate-400">Guarda un corte cuando los valores y el estado de las hipotecas estén confirmados.</p>}
        {snapshots.length > 0 && <div className="mt-4 divide-y divide-white/10">
          {snapshots.slice(0, 5).map((snapshot) => <div key={snapshot.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
            <span className="text-slate-400">{formatDate(snapshot.snapshot_date)}</span>
            <span className="tabular-nums text-white">{eur(Number(snapshot.net_worth_eur))}</span>
          </div>)}
        </div>}
      </section>

      {editingProperty && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
        <div role="dialog" aria-modal="true" aria-label={`Editar ${editingProperty.name}`} className="my-auto w-full max-w-5xl">
          <RealEstateForm key={editingProperty.id} property={editingProperty} onSaved={refreshAfterSave} onCancel={() => setEditingProperty(null)} />
        </div>
      </div>}
      {editingMortgage && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
        <div role="dialog" aria-modal="true" aria-label={`Actualizar ${editingMortgage.name}`} className="my-auto w-full max-w-5xl">
          <MortgageForm key={editingMortgage.id} properties={properties} mortgage={editingMortgage} onSaved={refreshAfterSave} onCancel={() => setEditingMortgage(null)} />
        </div>
      </div>}
    </main>
  )
}