'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import { Orcamento } from '@/types/pedido'
import { cn } from '@/lib/utils'
import { OrcamentoSummary } from './OrcamentoSummary'
import { OrcamentoDiscountPopover } from './OrcamentoDiscountPopover'
import { OrcamentoStatusButtons } from './OrcamentoStatusButtons'
import { PedidoItemsTable } from './PedidoItemsTable'

interface OrcamentoCardProps {
  orcamento: Orcamento
  pedidoId: string
  onActivate?: () => void
  onUpdate: () => void
  showActivateButton?: boolean
  showItems?: boolean
}

export function OrcamentoCard({
  orcamento,
  pedidoId,
  onActivate,
  onUpdate,
  showActivateButton = true,
  showItems = false,
}: OrcamentoCardProps) {
  return (
    <Card className={cn(orcamento.isAtivo && 'ring-2 ring-primary')}>
      <CardHeader className="pb-3">
        <OrcamentoSummary orcamento={orcamento} />
      </CardHeader>
      <CardContent className="pt-0">
        {showItems && (
          <div className="mb-4">
            <PedidoItemsTable items={orcamento.itens} onChange={() => {}} readOnly />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {orcamento.isAtivo && (
            <OrcamentoDiscountPopover
              orcamento={orcamento}
              pedidoId={pedidoId}
              onUpdate={onUpdate}
            />
          )}
          {showActivateButton && !orcamento.isAtivo && onActivate && (
            <Button variant="outline" size="sm" onClick={onActivate}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Ativar
            </Button>
          )}
        </div>

        {/* Status transition buttons */}
        <OrcamentoStatusButtons
          orcamento={orcamento}
          pedidoId={pedidoId}
          onUpdate={onUpdate}
        />
      </CardContent>
    </Card>
  )
}
