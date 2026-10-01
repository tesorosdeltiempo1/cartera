'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SaveWealthSnapshotButton({
  disabled,
  onSaved,
}: {
  disabled: boolean
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function saveSnapshot() {
    setSaving(true)
    setMessage('')
    try {
      const { error } = await supabase.rpc('save_wealth_snapshot')
      if (error) throw error
      setMessage('Corte patrimonial guardado.')
      onSaved()
    } catch (error) {
      setMessage(error instanceof Error ? `No se pudo guardar: ${error.message}` : 'No se pudo guardar el corte patrimonial.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={() => void saveSnapshot()}
        disabled={disabled || saving}
        className="rounded-lg bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar corte patrimonial'}
      </button>
      {message && <p role="status" className="max-w-sm text-xs text-slate-400">{message}</p>}
    </div>
  )
}