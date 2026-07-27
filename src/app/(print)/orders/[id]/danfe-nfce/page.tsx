'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { DanfeNfceThermalView } from '@/components/pedidos/DanfeNfceThermalView'
import { fetchPedidoById } from '@/lib/pedidos'
import type { Pedido } from '@/types/pedido'

/**
 * 80mm browser-print fallback for the DANFE-NFC-e. Reached when the USB printer
 * isn't available; lives under the (print) route group (no chrome) and
 * auto-opens the print dialog so the user can pick their thermal printer.
 */
export default function DanfeNfcePrintPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const load = async () => {
      try {
        const p = await fetchPedidoById(id)
        if (!cancelled) setPedido(p)
      } catch {
        if (!cancelled) setError('Não foi possível carregar o pedido')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  // Auto-open the print dialog once the coupon is on screen.
  useEffect(() => {
    if (pedido) {
      const t = setTimeout(() => window.print(), 300)
      return () => clearTimeout(t)
    }
  }, [pedido])

  if (error) return <div style={{ padding: 24 }}>{error}</div>
  if (!pedido) return <div style={{ padding: 24 }}>Carregando…</div>
  return <DanfeNfceThermalView pedido={pedido} />
}
