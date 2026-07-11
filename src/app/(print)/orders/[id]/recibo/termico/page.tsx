'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ReciboThermalPrintView } from '@/components/pedidos/recibo/ReciboThermalPrintView'
import { buildReciboModel, type ReciboModel } from '@/lib/pedido-recibo'
import { fetchPedidoById } from '@/lib/pedidos'
import { fetchClient } from '@/lib/clients'
import type { Client } from '@/types/client'

/**
 * 80mm browser-print fallback for the thermal receipt. Reached when the USB
 * printer isn't available; lives under the (print) route group (no chrome) and
 * auto-opens the print dialog so the user can pick their thermal printer.
 */
export default function ReciboTermicoPrintPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [model, setModel] = useState<ReciboModel | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const load = async () => {
      try {
        const pedido = await fetchPedidoById(id)
        let client: Client | null = null
        if (pedido.clienteId) {
          try {
            client = await fetchClient(pedido.clienteId)
          } catch {
            client = null
          }
        }
        if (!cancelled) setModel(buildReciboModel(pedido, client))
      } catch {
        if (!cancelled) setError('Não foi possível carregar o pedido')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  // Auto-open the print dialog once the receipt is on screen.
  useEffect(() => {
    if (model) {
      const t = setTimeout(() => window.print(), 300)
      return () => clearTimeout(t)
    }
  }, [model])

  if (error) return <div style={{ padding: 24 }}>{error}</div>
  if (!model) return <div style={{ padding: 24 }}>Carregando…</div>
  return <ReciboThermalPrintView model={model} />
}
