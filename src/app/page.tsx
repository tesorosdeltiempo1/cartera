import { supabase } from '@/lib/supabase'
import AddAssetForm from '@/components/AddAssetForm'
import EditAssetButton from '@/components/EditAssetButton'
import PortfolioChart from '@/components/PortfolioChart'
import SaveSnapshotButton from '@/components/SaveSnapshotButton'
import TrackRecordChart from '@/components/TrackRecordChart'

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

function categoryStyle(category: string) {
  switch (category) {
    case 'Núcleo Pasivo': return 'border-cyan-300/20 bg-cyan-300/10 text-cyan-200'
    case 'Satélite Convicción': return 'border-amber-300/20 bg-amber-300/10 text-amber-200'
    case 'Seguridad y Liquidez': return 'border-violet-300/20 bg-violet-300/10 text-violet-200'
    default: return 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
  }
}

export default async function Home() {
  const { data: assets, error } = await supabase.from('assets').select('*').order('category')
  const { data: snapshots } = await supabase.from('portfolio_snapshots').select('*').order('snapshot_date')

  const totales = CATEGORIES.map((cat) => {
    const items = (assets ?? []).filter((a) => a.category === cat)
    const value = items.reduce((sum, a) => sum + valorPosicion(a), 0)
    return { category: cat, value }
  })
  const granTotal = totales.reduce((s, c) => s + c.value, 0)

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 text-slate-100 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-teal-300/20 bg-teal-300/10 text-teal-200" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 19V5m0 14h16M7 15l4-4 3 2 5-6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 7h3v3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-200">Patrimonio personal</p>
            <h1 className="text-xl font-semibold tracking-tight text-white">Cartera</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300">
          <span className="size-1.5 rounded-full bg-teal-300" />
          Seguimiento manual
        </div>
      </header>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          No se pudieron cargar las posiciones: {error.message}
        </div>
      )}

      <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/90 via-slate-900 to-[#102a2a] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-28 size-80 rounded-full bg-teal-300/[0.07] blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-2 text-sm text-slate-400">Valor total estimado</p>
            <p className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{eur(granTotal)}</p>
            <p className="mt-3 text-sm text-slate-400">Basado en los precios registrados en tus posiciones.</p>
          </div>
          {granTotal > 0 && <SaveSnapshotButton totalValue={granTotal} breakdown={totales} />}
        </div>
      </section>

      {granTotal > 0 && (
        <>
          <section aria-label="Distribución por categoría" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {totales.map((total) => (
              <article key={total.category} className="rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 transition-colors hover:border-white/15 sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-2">
                  <p className="text-sm leading-5 text-slate-400">{total.category}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${categoryStyle(total.category)}`}>
                    {((total.value / granTotal) * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xl font-semibold tracking-tight text-white">{eur(total.value)}</p>
              </article>
            ))}
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <article className="min-w-0 rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 sm:p-5">
              <div className="mb-2">
                <h2 className="font-semibold text-white">Distribución de cartera</h2>
                <p className="mt-1 text-sm text-slate-400">Valor actual por categoría</p>
              </div>
              <PortfolioChart data={totales} />
            </article>

            {snapshots && snapshots.length > 0 ? (
              <article className="min-w-0 rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 sm:p-5">
                <div className="mb-2">
                  <h2 className="font-semibold text-white">Evolución del patrimonio</h2>
                  <p className="mt-1 text-sm text-slate-400">Snapshots guardados manualmente</p>
                </div>
                <TrackRecordChart data={snapshots} />
              </article>
            ) : (
              <article className="flex min-h-64 flex-col justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6">
                <p className="font-medium text-slate-200">Tu histórico empieza aquí</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">Guarda un snapshot cuando quieras registrar el valor de la cartera y comenzar a ver su evolución.</p>
              </article>
            )}
          </section>
        </>
      )}

      <section className="mb-6 rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 sm:p-6">
        <div className="mb-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Registro</p>
          <h2 className="text-lg font-semibold text-white">Añadir posición</h2>
          <p className="mt-1 text-sm text-slate-400">Introduce los datos disponibles; podrás completar o corregirlos más adelante.</p>
        </div>
        <AddAssetForm />
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/70">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.08] px-4 py-5 sm:px-6">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Detalle</p>
            <h2 className="text-lg font-semibold text-white">Posiciones</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
            {assets?.length ?? 0} {(assets?.length ?? 0) === 1 ? 'posición' : 'posiciones'}
          </span>
        </div>

        {assets && assets.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-medium text-slate-200">Aún no hay posiciones</p>
            <p className="mt-2 text-sm text-slate-400">Añade tu primera posición con el formulario de arriba.</p>
          </div>
        ) : assets && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-white/[0.025] text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Activo</th>
                  <th scope="col" className="px-4 py-3 font-medium">Categoría</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Cantidad</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">P. medio</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">P. actual</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Peso obj.</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {assets.map((asset) => (
                  <tr key={asset.id} className="transition-colors hover:bg-white/[0.025]">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-100">{asset.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{[asset.ticker, asset.broker].filter(Boolean).join(' · ') || 'Sin ticker ni broker'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${categoryStyle(asset.category)}`}>
                        {asset.category}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-300">{asset.quantity.toLocaleString('es-ES')}</td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-300">{asset.avg_price == null ? '—' : eur(asset.avg_price)}</td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-300">{asset.current_price == null ? '—' : eur(asset.current_price)}</td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-300">{asset.target_weight == null ? '—' : `${asset.target_weight}%`}</td>
                    <td className="px-5 py-4 text-right"><EditAssetButton asset={asset} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="py-8 text-center text-xs text-slate-600">Datos introducidos y revisados manualmente · No es asesoramiento financiero</footer>
    </main>
  )
}