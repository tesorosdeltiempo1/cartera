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
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 12, left: 8, bottom: 2 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
          <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={64} tickFormatter={(value) => Number(value).toLocaleString('es-ES', { maximumFractionDigits: 0 })} />
          <Tooltip
            formatter={(value) => (Number(value) || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
            contentStyle={{ backgroundColor: '#101b24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e8eff2' }}
          />
          <Line type="monotone" dataKey="valor" stroke="#5eead4" strokeWidth={2.5} dot={{ r: 3, fill: '#5eead4', stroke: '#102a2a', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#99f6e4', stroke: '#102a2a', strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}