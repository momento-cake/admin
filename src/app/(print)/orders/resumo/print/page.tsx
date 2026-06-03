'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ResumoPrintView } from '@/components/pedidos/resumo/ResumoPrintView'
import type { Pedido } from '@/types/pedido'
import { parseApiResponse } from '@/lib/error-handler'
import { parseIsoDateStart } from '@/lib/pedido-date-presets'

function buildRangeLabel(fromIso: string, toIso: string): string {
  if (!fromIso || !toIso) return ''
  const from = parseIsoDateStart(fromIso)
  const to = parseIsoDateStart(toIso)
  const f = (d: Date) => format(d, "dd/MM (EEEE)", { locale: ptBR })
  return `Semana de ${f(from)} a ${f(to)}`
}

function ResumoPrintContent() {
  const params = useSearchParams()
  const fromIso = params.get('from') ?? ''
  const toIso = params.get('to') ?? ''
  const comValores = params.get('prices') === '1'

  const invalidRange = !fromIso || !toIso
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (invalidRange) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/pedidos/resumo?from=${fromIso}&to=${toIso}`)
        const data = await parseApiResponse<Pedido[]>(res)
        if (!cancelled) setPedidos(data ?? [])
      } catch {
        if (!cancelled) setError('Não foi possível carregar os pedidos')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [fromIso, toIso, invalidRange])

  // Auto-open the print dialog once content is on screen.
  useEffect(() => {
    if (pedidos !== null) {
      const t = setTimeout(() => window.print(), 300)
      return () => clearTimeout(t)
    }
  }, [pedidos])

  if (invalidRange) {
    return <div style={{ padding: 24 }}>Período inválido</div>
  }
  if (error) {
    return <div style={{ padding: 24 }}>{error}</div>
  }
  if (pedidos === null) {
    return <div style={{ padding: 24 }}>Carregando…</div>
  }

  return (
    <ResumoPrintView
      pedidos={pedidos}
      rangeLabel={buildRangeLabel(fromIso, toIso)}
      comValores={comValores}
    />
  )
}

export default function ResumoPrintPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Carregando…</div>}>
      <ResumoPrintContent />
    </Suspense>
  )
}
