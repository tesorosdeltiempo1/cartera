'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { getNextContributionDate } from '@/lib/contributionPlans'
import { COMMON_CURRENCIES } from '@/lib/currencies'
import type { CashAccount, ContributionPlan, LedgerPosition } from '@/lib/ledger'
import { supabase } from '@/lib/supabase'
import { isCurrencyCodeSupported } from '@/lib/valuation'

const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100'
const labelClass = 'grid min-w-0 gap-1.5 text-sm text-slate-300'
const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function formatDate(value: string | null) {
  if (!value) return 'Sin próxima fecha'
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatMoney(value: number, currency: string) {
  return value.toLocaleString('es-ES', { style: 'currency', currency })
}

export default function ContributionPlansPanel({ positions, cashAccounts }: {
  positions: LedgerPosition[]
  cashAccounts: CashAccount[]
}) {
  const [plans, setPlans] = useState<ContributionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [open, setOpen] = useState(false)
  const [planType, setPlanType] = useState<'cash_deposit' | 'investment_purchase'>('investment_purchase')
  const [name, setName] = useState('')
  const [positionId, setPositionId] = useState('')
  const [cashAccountId, setCashAccountId] = useState('')
  const [newBroker, setNewBroker] = useState('')
  const [newCurrency, setNewCurrency] = useState('EUR')
  const [amount, setAmount] = useState('')
  const [cadence, setCadence] = useState<'weekly' | 'monthly'>('monthly')
  const [weekday, setWeekday] = useState('1')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('portfolio_contribution_plans').select('*').order('is_active', { ascending: false }).order('start_date')
      if (error) throw error
      setPlans((data ?? []) as ContributionPlan[])
      setLoadError('')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los planes previstos.')
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

  const chosenPosition = positions.find((position) => position.id === positionId)
  const chosenCashAccount = cashAccounts.find((account) => account.id === cashAccountId)
  const currency = planType === 'investment_purchase'
    ? chosenPosition?.currency ?? ''
    : chosenCashAccount?.currency ?? newCurrency
  const broker = planType === 'investment_purchase'
    ? chosenPosition?.broker?.trim() ?? ''
    : chosenCashAccount?.broker ?? newBroker.trim()

  function resetForm() {
    setName('')
    setPositionId('')
    setCashAccountId('')
    setNewBroker('')
    setAmount('')
    setCadence('monthly')
    setWeekday('1')
    setDayOfMonth('1')
    setStartDate(new Date().toISOString().slice(0, 10))
    setEndDate('')
    setMessage('')
    setErrorMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')
    setMessage('')
    const parsedAmount = Number(amount)
    const planCurrency = currency.trim().toUpperCase()
    if (!name.trim() || !broker || !isCurrencyCodeSupported(planCurrency) || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Completa nombre, cuenta/activo, moneda e importe válido.')
      setSaving(false)
      return
    }
    if (planType === 'investment_purchase' && !chosenPosition) {
      setErrorMessage('Selecciona la posición a la que se destina el plan.')
      setSaving(false)
      return
    }
    if (planType === 'cash_deposit' && !chosenCashAccount && !newBroker.trim()) {
      setErrorMessage('Indica la cuenta en la que se haría la aportación.')
      setSaving(false)
      return
    }
    if (endDate && endDate < startDate) {
      setErrorMessage('La fecha final debe ser posterior al inicio.')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase.from('portfolio_contribution_plans').insert({
        name: name.trim(),
        broker,
        currency: planCurrency,
        amount: parsedAmount,
        plan_type: planType,
        cadence,
        weekday: cadence === 'weekly' ? Number(weekday) : null,
        day_of_month: cadence === 'monthly' ? Number(dayOfMonth) : null,
        start_date: startDate,
        end_date: endDate || null,
        target_position_id: planType === 'investment_purchase' ? chosenPosition?.id : null,
      })
      if (error) throw error
      resetForm()
      setMessage('Plan previsto guardado. No se ha creado ningún movimiento ni cargo.')
      setOpen(false)
      await load()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar el plan previsto.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(plan: ContributionPlan) {
    setErrorMessage('')
    setSavingPlanId(plan.id)
    try {
      const { error } = await supabase.from('portfolio_contribution_plans').update({ is_active: !plan.is_active }).eq('id', plan.id)
      if (error) throw error
      await load()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo cambiar el estado del plan.')
    } finally {
      setSavingPlanId(null)
    }
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-200">Previsión personal</p>
          <h2 className="mt-1 text-lg text-white">Planes de aportación</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">Recordatorios de lo que planeas aportar. No ejecutan cargos ni crean movimientos; registra la operación cuando el banco o broker la realice.</p>
        </div>
        <button type="button" onClick={() => { resetForm(); setOpen((current) => !current) }} className="rounded-lg border border-teal-300/20 px-3 py-2 text-xs font-medium text-teal-100 hover:bg-teal-300/10">{open ? 'Cerrar' : 'Añadir plan'}</button>
      </div>

      {loadError && <div role="alert" className="mb-3 flex flex-wrap items-center gap-3 text-sm text-rose-200">
        <p>{loadError}</p>
        <button type="button" onClick={() => void load()} className="underline underline-offset-2">Reintentar</button>
      </div>}
      {errorMessage && <p role="alert" className="mb-3 text-sm text-rose-200">{errorMessage}</p>}
      {message && <p role="status" className="mb-3 text-sm text-emerald-200">{message}</p>}

      {open && <form onSubmit={handleSubmit} className="mb-5 grid gap-4 border-b border-white/10 pb-5">
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" aria-pressed={planType === 'investment_purchase'} onClick={() => setPlanType('investment_purchase')} className={`rounded-lg border px-3 py-2.5 text-left text-sm ${planType === 'investment_purchase' ? 'border-teal-300/30 bg-teal-300/10 text-teal-100' : 'border-white/10 text-slate-400'}`}>Compra periódica de una posición</button>
          <button type="button" aria-pressed={planType === 'cash_deposit'} onClick={() => setPlanType('cash_deposit')} className={`rounded-lg border px-3 py-2.5 text-left text-sm ${planType === 'cash_deposit' ? 'border-teal-300/30 bg-teal-300/10 text-teal-100' : 'border-white/10 text-slate-400'}`}>Ingreso previsto a una cuenta de caja</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className={labelClass}>Nombre del plan
            <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} placeholder="p. ej. Aportación mensual al fondo" className={inputClass} />
          </label>
          {planType === 'investment_purchase' ? <label className={labelClass}>Posición objetivo
            <select value={positionId} onChange={(event) => setPositionId(event.target.value)} required className={inputClass}>
              <option value="">Selecciona una posición</option>
              {positions.map((position) => <option key={position.id} value={position.id}>{position.name} · {position.broker ?? 'broker sin indicar'} · {position.currency ?? 'moneda pendiente'}</option>)}
            </select>
          </label> : <>
            <label className={labelClass}>Cuenta de caja
              <select value={cashAccountId} onChange={(event) => setCashAccountId(event.target.value)} className={inputClass}>
                <option value="">Otra cuenta…</option>
                {cashAccounts.map((account) => <option key={account.id} value={account.id}>{account.broker} · {account.currency}</option>)}
              </select>
            </label>
            {!chosenCashAccount && <label className={labelClass}>Banco o broker
              <input value={newBroker} onChange={(event) => setNewBroker(event.target.value)} required maxLength={120} placeholder="p. ej. Trade Republic" className={inputClass} />
            </label>}
            {!chosenCashAccount && <label className={labelClass}>Moneda
              <select value={newCurrency} onChange={(event) => setNewCurrency(event.target.value)} className={inputClass}>
                {COMMON_CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
              </select>
            </label>}
          </>}
          <label className={labelClass}>Importe previsto ({currency || 'moneda de la posición'})
            <input type="number" min="0.01" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} required className={inputClass} />
          </label>
          <label className={labelClass}>Frecuencia
            <select value={cadence} onChange={(event) => setCadence(event.target.value as 'weekly' | 'monthly')} className={inputClass}>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
          </label>
          {cadence === 'weekly' ? <label className={labelClass}>Día de la semana
            <select value={weekday} onChange={(event) => setWeekday(event.target.value)} className={inputClass}>
              {weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
          </label> : <label className={labelClass}>Día del mes
            <input type="number" min="1" max="31" value={dayOfMonth} onChange={(event) => setDayOfMonth(event.target.value)} required className={inputClass} />
            <span className="text-xs text-slate-500">En meses cortos se usa el último día del mes.</span>
          </label>}
          <label className={labelClass}>Empieza
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required className={inputClass} />
          </label>
          <label className={labelClass}>Termina (opcional)
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} min={startDate} className={inputClass} />
          </label>
        </div>
        <button type="submit" disabled={saving} className="w-full rounded-lg bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50 sm:w-fit">{saving ? 'Guardando…' : 'Guardar plan previsto'}</button>
      </form>}

      {loading ? <p className="py-4 text-sm text-slate-400">Cargando planes…</p> : plans.length === 0 ? <p className="py-4 text-sm text-slate-400">Aún no hay planes previstos.</p> : <div className="divide-y divide-white/10">
        {plans.map((plan) => {
          const nextDate = plan.is_active ? getNextContributionDate(plan) : null
          return <article key={plan.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium text-slate-200">{plan.name}</p>
              <p className="mt-1 text-xs text-slate-400">{formatMoney(Number(plan.amount), plan.currency)} · {plan.cadence === 'weekly' ? `cada ${weekdays[plan.weekday ?? 0].toLowerCase()}` : `el día ${plan.day_of_month}`} · {plan.broker}{plan.target_position_id ? ` · ${positions.find((position) => position.id === plan.target_position_id)?.name ?? 'posición'}` : ' · caja'}</p>
              <p className="mt-1 text-xs text-slate-500">{!plan.is_active ? 'Pausado' : nextDate ? `Próxima fecha prevista: ${formatDate(nextDate)}` : plan.end_date ? 'Vigencia finalizada' : 'Sin próxima fecha disponible'} · No ejecuta movimientos</p>
            </div>
            <button type="button" onClick={() => void toggleActive(plan)} disabled={savingPlanId !== null} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-teal-300/30 hover:text-teal-100 disabled:cursor-wait disabled:opacity-50">{savingPlanId === plan.id ? 'Guardando…' : plan.is_active ? 'Pausar' : 'Reanudar'}</button>
          </article>
        })}
      </div>}
    </section>
  )
}
