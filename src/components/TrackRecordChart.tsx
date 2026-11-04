'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useId } from 'react'

type Snapshot = { snapshot_date: string; total_value: number }

export default function TrackRecordChart({ data }: { data: Snapshot[] }) {
  const gradientId = `track-record-fill-${useId().replaceAll(':', '')}`
  const chartData = data.map((snapshot) => {
    const [year, month, day] = snapshot.snapshot_date.split('-').map(Number)
    return {
      date: Date.UTC(year, month - 1, day),
      dateLabel: snapshot.snapshot_date,
      valor: Number(snapshot.total_value),
    }
  }).filter((snapshot) => Number.isFinite(snapshot.date) && Number.isFinite(snapshot.valor))
    .sort((a, b) => a.date - b.date)
  if (chartData.length === 0) return null

  const firstDate = chartData[0].date
  const lastDate = chartData[chartData.length - 1].date
  const xDomain: [number, number] = firstDate === lastDate
    ? [firstDate - 86_400_000, lastDate + 86_400_000]
    : [firstDate, lastDate]
  const minimum = Math.min(0, ...chartData.map((snapshot) => snapshot.valor))
  const maximum = Math.max(0, ...chartData.map((snapshot) => snapshot.valor))
  const yDomain: [number, number] = minimum === maximum ? [-1, 1] : [minimum, maximum]

  function formatEuro(value: number) {
    return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  }

  return (
    <figure className="chart-figure">
      <figcaption className="chart-caption">Cortes puntuales · valores nominales · no ajustados por aportaciones y retiradas</figcaption>
      <div className="h-72 w-full" role="img" aria-label={`Gráfico de ${chartData.length} cortes patrimoniales entre ${chartData[0].dateLabel} y ${chartData[chartData.length - 1].dateLabel}. La escala vertical parte de cero.`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 8, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4b76f" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#d4b76f" stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(205,211,202,0.09)" />
          <XAxis
            dataKey="date"
            type="number"
            scale="time"
            domain={xDomain}
            tickCount={Math.min(chartData.length, 6)}
            stroke="#837d6c"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tickFormatter={(value) => new Date(Number(value)).toLocaleDateString('es-ES', { month: 'short', year: '2-digit', timeZone: 'UTC' })}
          />
          <YAxis
            domain={yDomain}
            stroke="#837d6c"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={76}
            tickFormatter={(value) => `${Number(value).toLocaleString('es-ES', { notation: 'compact', maximumFractionDigits: 1 })} €`}
          />
          <Tooltip
            formatter={(value) => formatEuro(Number(value) || 0)}
            labelFormatter={(value) => new Date(Number(value)).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
            labelStyle={{ color: '#c8bea8', marginBottom: 4 }}
            contentStyle={{ backgroundColor: '#171a17', border: '1px solid rgba(205,211,202,0.16)', borderRadius: 6, color: '#eee6d5' }}
          />
          <Area type="linear" dataKey="valor" name="Valor registrado" stroke="#c7a96b" strokeWidth={2} fill={`url(#${gradientId})`} dot={{ r: 3, fill: '#c7a96b', stroke: '#171a17', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#e5d1a5', stroke: '#171a17', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ol className="sr-only" aria-label="Valores exactos de cada corte">
        {chartData.map((snapshot, index) => (
          <li key={`${snapshot.dateLabel}-${index}`}>
            {new Date(`${snapshot.dateLabel}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}: {formatEuro(snapshot.valor)}
          </li>
        ))}
      </ol>
    </figure>
  )
}