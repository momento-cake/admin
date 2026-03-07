'use client'

import { Badge } from '@/components/ui/badge'
import { FileText } from 'lucide-react'
import { Orcamento, ORCAMENTO_STATUS_LABELS } from '@/types/pedido'
import { formatPrice } from '@/lib/products'
import { cn } from '@/lib/utils'

const ORC_STATUS_COLORS: Record<string, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-800 border-gray-200',
  ENVIADO: 'bg-blue-100 text-blue-800 border-blue-200',
  APROVADO: 'bg-green-100 text-green-800 border-green-200',
  REJEITADO: 'bg-red-100 text-red-800 border-red-200',
}

interface OrcamentoSummaryProps {
  orcamento: Orcamento
}

export function OrcamentoSummary({ orcamento }: OrcamentoSummaryProps) {
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '-'
    let date: Date
    if (timestamp.toDate) {
      date = timestamp.toDate()
    } else if (timestamp._seconds !== undefined) {
      date = new Date(timestamp._seconds * 1000)
    } else {
      date = new Date(timestamp)
    }
    if (isNaN(date.getTime())) return '-'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <>
      {/* Header row */}
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">
          Versao {orcamento.versao}
        </span>
        {orcamento.isAtivo && (
          <Badge className="bg-primary text-primary-foreground text-xs">
            Ativo
          </Badge>
        )}
        <Badge
          variant="outline"
          className={cn('text-xs', ORC_STATUS_COLORS[orcamento.status])}
        >
          {ORCAMENTO_STATUS_LABELS[orcamento.status]}
        </Badge>
      </div>

      {/* Details row */}
      <div className="flex items-center justify-between mt-3">
        <div className="text-sm text-muted-foreground space-y-1">
          <p>{orcamento.itens.length} {orcamento.itens.length !== 1 ? 'itens' : 'item'}</p>
          <p>Criado em {formatDate(orcamento.criadoEm)}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-lg font-bold">{formatPrice(orcamento.total)}</p>
          {orcamento.subtotal !== orcamento.total && (
            <p className="text-xs text-muted-foreground">
              Subtotal: {formatPrice(orcamento.subtotal)}
            </p>
          )}
          {orcamento.desconto > 0 && (
            <p className="text-xs text-muted-foreground">
              Desconto: {orcamento.descontoTipo === 'percentual'
                ? `${orcamento.desconto}%`
                : formatPrice(orcamento.desconto)}
            </p>
          )}
          {orcamento.acrescimo > 0 && (
            <p className="text-xs text-muted-foreground">
              Acrescimo: {formatPrice(orcamento.acrescimo)}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
