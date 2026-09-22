import { supabase } from '@/lib/supabase'
import AddAssetForm from '@/components/AddAssetForm'

export default async function Home() {
  const { data: assets, error } = await supabase.from('assets').select('*').order('category')

  return (
    <main className="p-8 max-w-4xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-6">Cartera</h1>

      <AddAssetForm />

      {error && <p className="text-red-500">Error: {error.message}</p>}
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