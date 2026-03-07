'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import { Orcamento } from '@/types/pedido'
import { cn } from '@/lib/utils'
import { OrcamentoSummary } from './OrcamentoSummary'
import { OrcamentoDiscountPopover } from './OrcamentoDiscountPopover'
import { OrcamentoStatusButtons } from './OrcamentoStatusButtons'

interface OrcamentoCardProps {
  orcamento: Orcamento
  pedidoId: string
  onActivate?: () => void
  onView?: () => void
  onUpdate: () => void
  showActivateButton?: boolean
}

export function OrcamentoCard({
  orcamento,
  pedidoId,
  onActivate,
  onView,
  onUpdate,
  showActivateButton = true,
}: OrcamentoCardProps) {
  return (
    <Card className={cn(orcamento.isAtivo && 'ring-2 ring-primary')}>
      <CardHeader className="pb-3">
        <OrcamentoSummary orcamento={orcamento} />
      </CardHeader>
      <CardContent className="pt-0">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {onView && (
            <Button variant="outline" size="sm" onClick={onView}>
              Ver Itens
            </Button>
          )}
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
