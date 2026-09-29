type CategoryAllocation = {
  category: string
  actualWeight: number
  targetWeight: number
  hasPositions: boolean
  targetComplete: boolean
}

type Props = {
  data: CategoryAllocation[]
  positionsWithTarget: number
  totalPositions: number
}

function percent(value: number) {
  return `${value.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function deviation(value: number) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pp`
}

function barWidth(value: number) {
  return `${Math.min(Math.max(value, 0), 100)}%`
}

export default function AllocationComparison({ data, positionsWithTarget, totalPositions }: Props) {
  return (
    <section aria-labelledby="allocation-title" className="mb-6 rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 sm:p-5">
      <div className="mb-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Política de inversión</p>
        <h2 id="allocation-title" className="font-semibold text-white">Peso real vs. objetivo</h2>
        <p className="mt-1 text-sm text-slate-400">
          Objetivo global informado en {positionsWithTarget} de {totalPositions} activos consolidados. La desviación solo se calcula cuando todos los activos de una categoría tienen objetivo.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {data.map((item) => {
          const complete = item.hasPositions && item.targetComplete
          const difference = item.actualWeight - item.targetWeight

          return (
            <article key={item.category} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-medium text-slate-200">{item.category}</h3>
                <span className={`text-xs font-medium ${complete ? Math.abs(difference) < 0.05 ? 'text-teal-200' : 'text-amber-200' : 'text-slate-500'}`}>
                  {complete ? deviation(difference) : item.hasPositions ? 'Objetivo incompleto' : 'Sin posiciones'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="mb-1 flex justify-between gap-2 text-slate-400">
                    <span>Peso real</span>
                    <span className="tabular-nums text-slate-200">{percent(item.actualWeight)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden="true">
                    <div className="h-full rounded-full bg-teal-300" style={{ width: barWidth(item.actualWeight) }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between gap-2 text-slate-400">
                    <span>Peso objetivo</span>
                    <span className="tabular-nums text-slate-200">
                      {!item.hasPositions ? '—' : complete ? percent(item.targetWeight) : `Parcial · ${percent(item.targetWeight)}`}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden="true">
                    <div className="h-full rounded-full bg-violet-300" style={{ width: barWidth(item.targetWeight) }} />
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        La desviación se expresa en puntos porcentuales (real menos objetivo). Es una comparación informativa, no una recomendación de compra o venta.
      </p>
    </section>
  )
}
