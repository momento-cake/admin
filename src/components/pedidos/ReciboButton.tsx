'use client'

import { useState } from 'react'
import { Receipt, Loader2, FileText, Printer, Usb, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Pedido } from '@/types/pedido'
import type { Client } from '@/types/client'
import type { ReciboModel } from '@/lib/pedido-recibo'
import { COMPANY_INFO } from '@/lib/company-info'
import { buildReciboModel, generateReciboPDF, loadLogoDataUrl } from '@/lib/pedido-recibo'

interface ReciboButtonProps {
  pedido: Pedido
  className?: string
}

/**
 * Produces the order receipt (recibo/venda) in one of two formats, chosen from a
 * dropdown:
 *  - PDF: A4 document downloaded via jsPDF.
 *  - Thermal: raw ESC/POS sent to an 80mm USB printer (Elgin i9); if no printer
 *    is reachable it falls back to an 80mm browser-print page.
 * Both share the same view-model, so the outputs stay in sync.
 */
export function ReciboButton({ pedido, className }: ReciboButtonProps) {
  const [loading, setLoading] = useState<null | 'pdf' | 'thermal'>(null)

  // Full client details are best-effort — the receipt still renders from the
  // order snapshot if the client can't be fetched.
  const buildModel = async (): Promise<ReciboModel> => {
    let client: Client | null = null
    if (pedido.clienteId) {
      try {
        // Deferred import keeps the Firebase-backed clients module out of this
        // component's load-time graph (mirrors the jsPDF dynamic import).
        const { fetchClient } = await import('@/lib/clients')
        client = await fetchClient(pedido.clienteId)
      } catch {
        client = null
      }
    }
    return buildReciboModel(pedido, client)
  }

  const handlePdf = async () => {
    setLoading('pdf')
    try {
      const model = await buildModel()
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
      console.error('Erro ao gerar recibo em PDF:', error)
      toast.error('Não foi possível gerar o recibo em PDF. Tente novamente.')
    } finally {
      setLoading(null)
    }
  }

  // Opens the 80mm print page in a new tab; the browser print dialog lets the
  // user pick the thermal printer via its installed system driver. This is the
  // reliable path on Windows, where a driver-bound printer (e.g. Elgin i9) is
  // invisible to WebUSB.
  const openThermalPrint = () => {
    window.open(`/orders/${pedido.id}/recibo/termico`, '_blank')
  }

  // Direct raw ESC/POS over USB. Only works where the printer is exposed to
  // WebUSB (Chrome/Edge + a WinUSB-bound device); otherwise falls back to the
  // 80mm system-driver print page.
  const handleThermalUsb = async () => {
    setLoading('thermal')
    try {
      const { isWebUsbSupported, printEscPos, PrinterUnavailableError } = await import(
        '@/lib/webusb-printer'
      )
      if (!isWebUsbSupported()) {
        toast.info('WebUSB indisponível — abrindo impressão 80mm.')
        openThermalPrint()
        return
      }

      const model = await buildModel()
      const { buildThermalReceipt, loadLogoImageData } = await import('@/lib/pedido-recibo-thermal')
      const logo = await loadLogoImageData(COMPANY_INFO.logoPath)
      const bytes = buildThermalReceipt(model, logo)

      try {
        await printEscPos(bytes)
        toast.success('Recibo enviado para a impressora.')
      } catch (err) {
        if (err instanceof PrinterUnavailableError) {
          toast.info('Impressora USB não encontrada — abrindo impressão 80mm.')
          openThermalPrint()
        } else {
          throw err
        }
      }
    } catch (error) {
      console.error('Erro ao imprimir recibo térmico:', error)
      toast.error('Não foi possível imprimir o recibo. Tente novamente.')
    } finally {
      setLoading(null)
    }
  }

  const busy = loading !== null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy} className={cn(className)}>
          {busy ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Receipt className="h-4 w-4 mr-2" />
          )}
          Recibo
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handlePdf} disabled={busy}>
          <FileText className="h-4 w-4 mr-2" />
          Baixar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openThermalPrint} disabled={busy}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir térmica 72mm
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleThermalUsb} disabled={busy}>
          <Usb className="h-4 w-4 mr-2" />
          USB direto (ESC/POS)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
