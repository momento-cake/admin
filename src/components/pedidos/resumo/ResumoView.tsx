'use client'

import type { ReactNode } from 'react'
import { ClipboardList, ListChecks, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Pedido } from '@/types/pedido'
import { ResumoPedidosTab } from './ResumoPedidosTab'
import { ResumoItensTab } from './ResumoItensTab'

/** Build the print-route URL for a range + price variant. */
export function buildPrintHref(fromIso: string, toIso: string, comValores: boolean): string {
  const params = new URLSearchParams({
    from: fromIso,
    to: toIso,
    prices: comValores ? '1' : '0',
  })
  return `/orders/resumo/print?${params.toString()}`
}

interface ResumoViewProps {
  pedidos: Pedido[]
  fromIso: string
  toIso: string
  /** The range selector control, rendered in the header (owned by the page). */
  rangeSelector?: ReactNode
  loading?: boolean
}

export function ResumoView({ pedidos, fromIso, toIso, rangeSelector, loading }: ResumoViewProps) {
  const canPrint = !!fromIso && !!toIso

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {rangeSelector}
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="gap-2" disabled={!canPrint}>
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Versão para impressão</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <a href={buildPrintHref(fromIso, toIso, false)} target="_blank" rel="noopener noreferrer">
                  Sem valores (produção)
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={buildPrintHref(fromIso, toIso, true)} target="_blank" rel="noopener noreferrer">
                  Com valores (financeiro)
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando pedidos…</div>
      ) : (
        <Tabs defaultValue="pedidos">
          <TabsList>
            <TabsTrigger value="pedidos" className="gap-1">
              <ClipboardList className="h-4 w-4" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="itens" className="gap-1">
              <ListChecks className="h-4 w-4" />
              Itens
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pedidos">
            <ResumoPedidosTab pedidos={pedidos} />
          </TabsContent>
          <TabsContent value="itens">
            <ResumoItensTab pedidos={pedidos} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
