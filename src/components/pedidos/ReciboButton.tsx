'use client'

import { useState } from 'react'
import { Receipt, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Pedido } from '@/types/pedido'
import type { Client } from '@/types/client'
import { COMPANY_INFO } from '@/lib/company-info'
import { buildReciboModel, generateReciboPDF, loadLogoDataUrl } from '@/lib/pedido-recibo'

interface ReciboButtonProps {
  pedido: Pedido
  className?: string
}

/**
 * Generates a downloadable PDF receipt (recibo/venda) for an order. Fetches the
 * full client record for the client block (falling back to the order snapshot
 * when unavailable), builds the receipt model, renders it with jsPDF, and
 * triggers a browser download.
 */
export function ReciboButton({ pedido, className }: ReciboButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      // Full client details are best-effort — the receipt still renders from
      // the order snapshot if the client can't be fetched.
      let client: Client | null = null
      if (pedido.clienteId) {
        try {
          // Deferred import keeps the Firebase-backed clients module out of
          // this component's load-time graph (mirrors the jsPDF dynamic import).
          const { fetchClient } = await import('@/lib/clients')
          client = await fetchClient(pedido.clienteId)
        } catch {
          client = null
        }
      }

      const model = buildReciboModel(pedido, client)
      const logoDataUrl = await loadLogoDataUrl(COMPANY_INFO.logoPath)
      const blob = await generateReciboPDF(model, logoDataUrl)

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `Recibo-Pedido-${pedido.numeroPedido}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao gerar recibo:', error)
      toast.error('Não foi possível gerar o recibo. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={loading}
      className={cn(className)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Receipt className="h-4 w-4 mr-2" />
      )}
      Gerar Recibo
    </Button>
  )
}
