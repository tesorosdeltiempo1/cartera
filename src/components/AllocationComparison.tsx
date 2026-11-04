type CategoryAllocation = {
  category: string
  actualWeight: number
  targetWeight: number
  hasPositions: boolean
  hasTargetAssets: boolean
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
  const assignedTargetWeight = data.reduce((sum, item) => sum + item.targetWeight, 0)
  const actualCoverage = data.reduce((sum, item) => sum + item.actualWeight, 0)
  const targetsComplete = totalPositions > 0 && positionsWithTarget === totalPositions

  return (
    <section aria-labelledby="allocation-title" className="dashboard-inner-card p-4 sm:p-5">
      <div className="mb-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Política de inversión</p>
        <h2 id="allocation-title" className="font-semibold text-slate-100">Peso real vs. objetivo</h2>
        <p className="mt-1 text-sm text-slate-400">
          Objetivo global informado en {positionsWithTarget} de {totalPositions} activos consolidados. La desviación solo se calcula cuando todos los activos de una categoría tienen objetivo.
        </p>
      </div>

      <dl className="mb-5 grid gap-3 border-y border-white/[0.07] py-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-slate-400">Objetivos declarados</dt>
          <dd className="mt-1 font-medium tabular-nums text-slate-100">{positionsWithTarget} de {totalPositions} activos</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Suma de objetivos registrados</dt>
          <dd className="mt-1 font-medium tabular-nums text-slate-100">{percent(assignedTargetWeight)}</dd>
          <dd className="mt-0.5 text-xs text-slate-500">{targetsComplete ? assignedTargetWeight < 99.95 ? `${percent(100 - assignedTargetWeight)} sin asignar` : assignedTargetWeight > 100.05 ? `${percent(assignedTargetWeight - 100)} por encima de 100%` : 'asignación completa' : 'suma parcial; faltan activos por definir'}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Valor actual incluido en la comparativa</dt>
          <dd className="mt-1 font-medium tabular-nums text-slate-100">{percent(actualCoverage)}</dd>
          <dd className="mt-0.5 text-xs text-slate-500">del total de cartera y efectivo en EUR</dd>
        </div>
      </dl>

      <div className="grid gap-3 sm:grid-cols-2">
        {data.map((item) => {
          const complete = item.hasTargetAssets && item.targetComplete
          const difference = item.actualWeight - item.targetWeight

          return (
            <article key={item.category} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-medium text-slate-200">{item.category}</h3>
                <span className={`text-xs font-medium ${complete ? Math.abs(difference) < 0.05 ? 'text-emerald-200' : 'text-amber-200' : 'text-slate-400'}`}>
                  {complete ? deviation(difference) : item.hasTargetAssets ? 'Objetivo incompleto' : item.hasPositions ? 'Sin objetivo definido' : 'Sin posiciones'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="mb-1 flex justify-between gap-2 text-slate-400">
                    <span>Peso real</span>
                    <span className="tabular-nums text-slate-200">{percent(item.actualWeight)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                    <div className="h-full rounded-full bg-teal-300" style={{ width: barWidth(item.actualWeight) }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between gap-2 text-slate-400">
                    <span>Peso objetivo</span>
                    <span className="tabular-nums text-slate-200">
                      {!item.hasTargetAssets ? '—' : complete ? percent(item.targetWeight) : `Parcial · ${percent(item.targetWeight)}`}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                    <div className="h-full rounded-full bg-violet-300" style={{ width: barWidth(item.targetWeight) }} />
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-400">
        La desviación se expresa en puntos porcentuales (peso real menos peso objetivo). La exposición sin activo consolidado se excluye de la comparativa; el efectivo no tiene un objetivo configurable en esta pantalla. Comparación informativa, no recomendación de compra o venta.
      </p>
    </section>
  )
}
