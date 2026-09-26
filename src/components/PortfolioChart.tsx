'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#5ec8f8', '#f6b83c', '#c090f5', '#00d9a3']

type Slice = { category: string; value: number }

export default function PortfolioChart({ data }: { data: Slice[] }) {
  const chartData = data.filter((d) => d.value > 0)
  if (chartData.length === 0) return null

  return (
    <div className="w-full h-72 mb-8">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="category" innerRadius={60} outerRadius={100} paddingAngle={2}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
                    <Tooltip formatter={(value) => (Number(value) || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}