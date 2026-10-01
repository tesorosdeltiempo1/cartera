'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type Snapshot = { snapshot_date: string; total_value: number }

export default function TrackRecordChart({ data }: { data: Snapshot[] }) {
  if (data.length === 0) return null

  const chartData = data.map((s) => ({
    date: new Date(`${s.snapshot_date}T00:00:00`).getTime(),
    valor: s.total_value,
  })).sort((a, b) => a.date - b.date)

  function formatEuro(value: number) {
    return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 8, bottom: 2 }}>
          <defs>
            <linearGradient id="track-record-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4b76f" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#d4b76f" stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="rgba(201,168,93,0.13)" />
          <XAxis
            dataKey="date"
            stroke="#837d6c"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tickFormatter={(value) => new Date(Number(value)).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })}
          />
          <YAxis
            stroke="#837d6c"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={76}
            tickFormatter={(value) => `${Number(value).toLocaleString('es-ES', { notation: 'compact', maximumFractionDigits: 1 })} €`}
          />
          <Tooltip
            formatter={(value) => formatEuro(Number(value) || 0)}
            labelFormatter={(value) => new Date(Number(value)).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            labelStyle={{ color: '#c8bea8', marginBottom: 4 }}
            contentStyle={{ backgroundColor: '#18211b', border: '1px solid rgba(201,168,93,0.24)', borderRadius: 12, color: '#eee6d5' }}
          />
          <Area type="monotone" dataKey="valor" name="Valor patrimonial" stroke="#d4b76f" strokeWidth={2.5} fill="url(#track-record-fill)" dot={{ r: 3, fill: '#d4b76f', stroke: '#18211b', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#f1dfb1', stroke: '#18211b', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}