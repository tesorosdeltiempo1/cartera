import { supabase } from '@/lib/supabase'
import AddAssetForm from '@/components/AddAssetForm'
import PortfolioChart from '@/components/PortfolioChart'

export const dynamic = 'force-dynamic'

const CATEGORIES = ['Núcleo Pasivo', 'Satélite Convicción', 'Seguridad y Liquidez', 'Especulativo']

type Asset = {
  id: string
  name: string
  ticker: string | null
  category: string
  broker: string | null
  quantity: number
  avg_price: number | null
  current_price: number | null
  target_weight: number | null
}

function valorPosicion(a: Asset) {
  const precio = a.current_price ?? a.avg_price ?? 0
  return a.quantity * precio
}

function eur(n: number) {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

export default async function Home() {
  const { data: assets, error } = await supabase.from('assets').select('*').order('category')

  const totales = CATEGORIES.map((cat) => {
    const items = (assets ?? []).filter((a) => a.category === cat)
    const value = items.reduce((sum, a) => sum + valorPosicion(a), 0)
    return { category: cat, value }
  })
  const granTotal = totales.reduce((s, c) => s + c.value, 0)

  return (
    <main className="p-8 max-w-4xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-1">Cartera</h1>
      <p className="text-3xl font-bold mb-6">{eur(granTotal)}</p>

      {error && <p className="text-red-500">Error: {error.message}</p>}

      {granTotal > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {totales.map((t) => (
              <div key={t.category} className="bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">{t.category}</p>
                <p className="text-lg font-bold">{eur(t.value)}</p>
                <p className="text-sm text-gray-400">
                  {granTotal > 0 ? ((t.value / granTotal) * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
            ))}
          </div>
          <PortfolioChart data={totales} />
        </>
      )}

      <AddAssetForm />

      {assets && assets.length === 0 && <p className="text-gray-400">Aún no has añadido ninguna posición.</p>}

      {assets && assets.length > 0 && (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-2">Nombre</th><th className="p-2">Ticker</th><th className="p-2">Categoría</th>
              <th className="p-2">Broker</th><th className="p-2">Cant.</th><th className="p-2">P. medio</th>
              <th className="p-2">P. actual</th><th className="p-2">Peso obj.</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-b border-gray-800">
                <td className="p-2">{a.name}</td><td className="p-2">{a.ticker}</td><td className="p-2">{a.category}</td>
                <td className="p-2">{a.broker}</td><td className="p-2">{a.quantity}</td><td className="p-2">{a.avg_price}</td>
                <td className="p-2">{a.current_price}</td><td className="p-2">{a.target_weight}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}