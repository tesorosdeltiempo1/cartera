'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#5ec8f8', '#f6b83c', '#c090f5', '#00d9a3']

type Slice = { category: string; value: number }

export default function PortfolioChart({ data }: { data: Slice[] }) {
  const chartData = data.filter((d) => d.value > 0)
  if (chartData.length === 0) return null

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="category" innerRadius={62} outerRadius={98} paddingAngle={3} stroke="none">
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => (Number(value) || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            contentStyle={{ backgroundColor: '#101b24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e8eff2' }}
            itemStyle={{ color: '#e8eff2' }}
          />
          <Legend wrapperStyle={{ color: '#a7b5bf', fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}