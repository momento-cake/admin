'use client'

import { Pencil, Truck, Store } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PedidoItem } from '@/types/pedido'
import { Address } from '@/types/client'
import { formatPrice } from '@/lib/products'

interface RevisaoStepProps {
  client: { id: string; nome: string; telefone?: string }
  items: PedidoItem[]
  entregaTipo: 'ENTREGA' | 'RETIRADA'
  selectedAddress: Address | { id: string; nome: string } | null
  dataEntrega: string
  observacoes: string
  observacoesCliente: string
  onEditStep: (step: number) => void // click "Editar" to jump back
}

function formatReviewAddress(addr: Address | { id: string; nome: string }): string {
  if ('endereco' in addr) {
    const parts: string[] = []
    const a = addr as Address
    if (a.endereco) {
      parts.push(a.numero ? `${a.endereco}, ${a.numero}` : a.endereco)
    }
    if (a.bairro) parts.push(a.bairro)
    if (a.cidade) parts.push(a.cidade)
    if (a.cep) parts.push(`CEP: ${a.cep}`)
    return parts.join(', ')
  }
  if ('nome' in addr) {
    return (addr as { id: string; nome: string }).nome
  }
  return ''
}

export function RevisaoStep({
  client,
  items,
  entregaTipo,
  selectedAddress,
  dataEntrega,
  observacoes,
  observacoesCliente,
  onEditStep,
}: RevisaoStepProps) {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Resumo do Pedido</h3>
        <p className="text-sm text-muted-foreground">
          Revise os dados antes de criar o pedido
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-0">
          {/* Header */}
          <div className="text-center pb-4">
            <h4 className="text-base font-semibold">Confirme seu Pedido</h4>
            <div className="w-16 h-0.5 bg-primary mx-auto mt-2" />
          </div>

          <Separator />

          {/* Section 1 - Cliente */}
          <div className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cliente
              </span>
              <button
                type="button"
                onClick={() => onEditStep(0)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Pencil className="h-3 w-3" />
                Editar
              </button>
            </div>
            <p className="text-sm font-medium">{client.nome}</p>
            {client.telefone && (
              <p className="text-xs text-muted-foreground">{client.telefone}</p>
            )}
          </div>

          <Separator />

          {/* Section 2 - Itens */}
          <div className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Itens
              </span>
              <button
                type="button"
                onClick={() => onEditStep(1)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Pencil className="h-3 w-3" />
                Editar
              </button>
            </div>
            <div className="space-y-1">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="flex-1 min-w-0 truncate">
                    {item.nome}
                    <span className="text-muted-foreground ml-1">x{item.quantidade}</span>
                  </span>
                  <span className="ml-4 flex-shrink-0 font-medium">
                    {formatPrice(item.total)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-dashed">
              <span className="text-sm font-semibold">Subtotal</span>
              <span className="text-sm font-bold text-primary">
                {formatPrice(subtotal)}
              </span>
            </div>
          </div>

          <Separator />

          {/* Section 3 - Entrega */}
          <div className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Entrega
              </span>
              <button
                type="button"
                onClick={() => onEditStep(2)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Pencil className="h-3 w-3" />
                Editar
              </button>
            </div>
            <div className="flex items-center gap-2 mb-1">
              {entregaTipo === 'ENTREGA' ? (
                <Truck className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Store className="h-4 w-4 text-muted-foreground" />
              )}
              <Badge variant="secondary" className="text-xs">
                {entregaTipo === 'ENTREGA' ? 'Entrega' : 'Retirada'}
              </Badge>
            </div>
            {selectedAddress ? (
              <p className="text-xs text-muted-foreground">
                {formatReviewAddress(selectedAddress)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Endereço a ser definido
              </p>
            )}
          </div>

          <Separator />

          {/* Section 4 - Detalhes */}
          <div className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Detalhes
              </span>
              <button
                type="button"
                onClick={() => onEditStep(3)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Pencil className="h-3 w-3" />
                Editar
              </button>
            </div>
            {dataEntrega ? (
              <p className="text-sm">
                <span className="text-muted-foreground">Data: </span>
                {new Date(dataEntrega + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Data não definida
              </p>
            )}
            {observacoes && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                <span className="font-medium">Notas internas:</span> {observacoes}
              </p>
            )}
            {observacoesCliente && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                <span className="font-medium">Notas para cliente:</span> {observacoesCliente}
              </p>
            )}
          </div>

          <Separator />

          {/* Footer - Total */}
          <div className="pt-4 flex items-center justify-between">
            <span className="text-base font-semibold">Total</span>
            <span className="text-xl font-bold text-primary">
              {formatPrice(subtotal)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
