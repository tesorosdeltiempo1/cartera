'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#c9ad66', '#bd8254', '#aa9561', '#b87542', '#849b65']

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
            contentStyle={{ backgroundColor: '#18211b', border: '1px solid rgba(201,168,93,0.24)', borderRadius: 12, color: '#eee6d5' }}
            itemStyle={{ color: '#eee6d5' }}
          />
          <Legend wrapperStyle={{ color: '#aaa38f', fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}