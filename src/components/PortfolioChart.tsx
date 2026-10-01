'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#c9ad66', '#bd8254', '#aa9561', '#b87542', '#849b65']

type Slice = { category: string; value: number }

export default function PortfolioChart({ data }: { data: Slice[] }) {
  const chartData = data.filter((d) => d.value > 0)
  if (chartData.length === 0) return null
  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  function formatEuro(value: number) {
    return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  }

  return (
    <div className="grid w-full items-center gap-2 sm:grid-cols-[minmax(14rem,0.9fr)_minmax(0,1.1fr)]">
      <div className="relative h-64 min-w-0 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="category" innerRadius="65%" outerRadius="88%" paddingAngle={3} stroke="none">
              {chartData.map((item) => {
                const colorIndex = data.findIndex((datum) => datum.category === item.category)
                return <Cell key={item.category} fill={COLORS[colorIndex % COLORS.length]} />
              })}
            </Pie>
            <Tooltip
              formatter={(value) => formatEuro(Number(value) || 0)}
              contentStyle={{ backgroundColor: '#18211b', border: '1px solid rgba(201,168,93,0.24)', borderRadius: 12, color: '#eee6d5' }}
              itemStyle={{ color: '#eee6d5' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Total en EUR</span>
          <span className="mt-1 max-w-36 text-sm font-semibold tabular-nums text-slate-100">{formatEuro(total)}</span>
        </div>
      </div>
      <ul aria-label="Composición de cartera por categoría" className="grid content-center gap-1 px-2 sm:px-0">
        {chartData.map((item) => {
          const colorIndex = data.findIndex((datum) => datum.category === item.category)
          const weight = item.value / total * 100
          return (
            <li key={item.category} className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-2.5 last:border-0">
              <span className="flex min-w-0 items-center gap-2.5 text-sm text-slate-300">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: COLORS[colorIndex % COLORS.length] }} />
                <span className="truncate">{item.category}</span>
              </span>
              <span className="shrink-0 text-right tabular-nums">
                <span className="block text-sm text-slate-100">{formatEuro(item.value)}</span>
                <span className="block text-xs text-slate-500">{weight.toLocaleString('es-ES', { maximumFractionDigits: 1 })}%</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}