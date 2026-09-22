import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: assets, error } = await supabase.from('assets').select('*')

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Cartera — test de conexión</h1>
      {error && <p className="text-red-500">Error: {error.message}</p>}
      <pre className="bg-gray-100 p-4 rounded text-sm">
        {JSON.stringify(assets, null, 2)}
      </pre>
    </main>
  )
}