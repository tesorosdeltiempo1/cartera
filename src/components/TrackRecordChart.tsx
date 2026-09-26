'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type Snapshot = { snapshot_date: string; total_value: number }

export default function TrackRecordChart({ data }: { data: Snapshot[] }) {
  if (data.length === 0) return null

  const chartData = data.map((s) => ({
    date: new Date(s.snapshot_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    valor: s.total_value,
  }))

  return (
    <div className="w-full h-64 mb-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="date" stroke="#888" fontSize={12} />
          <YAxis stroke="#888" fontSize={12} />
          <Tooltip
            formatter={(value) => (Number(value) || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
          />
          <Line type="monotone" dataKey="valor" stroke="#00d9a3" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}