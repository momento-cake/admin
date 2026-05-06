'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Loader2, FileText as FileTextIcon } from 'lucide-react'
import { Pedido, Orcamento, PedidoItem } from '@/types/pedido'
import { parseApiResponse, describeError } from '@/lib/error-handler'
import { usePedidoOptional } from '@/contexts/PedidoContext'
import { OrcamentoCard } from './OrcamentoCard'
import { PedidoItemsTable } from './PedidoItemsTable'
import { formatPrice } from '@/lib/products'

interface OrcamentoManagerProps {
  pedido: Pedido
  onUpdate: () => void
}

export function OrcamentoManager({ pedido, onUpdate }: OrcamentoManagerProps) {
  const pedidoCtx = usePedidoOptional()
  const [creating, setCreating] = useState(false)
  const [activating, setActivating] = useState<string | null>(null)
  const [viewingOrcamento, setViewingOrcamento] = useState<Orcamento | null>(null)

  const activeOrcamento = pedido.orcamentos.find((o) => o.isAtivo)
  const historicalOrcamentos = pedido.orcamentos
    .filter((o) => !o.isAtivo)
    .sort((a, b) => b.versao - a.versao)

  const handleCreateNew = async () => {
    if (!activeOrcamento) {
      toast.error('Nenhum orçamento ativo para copiar')
      return
    }

    setCreating(true)
    try {
      const response = await fetch(`/api/pedidos/${pedido.id}/orcamento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens: activeOrcamento.itens,
          desconto: activeOrcamento.desconto,
          descontoTipo: activeOrcamento.descontoTipo,
          acrescimo: activeOrcamento.acrescimo,
        }),
      })
      await parseApiResponse(response)
      toast.success('Nova versão do orçamento criada')

      if (pedidoCtx) {
        await pedidoCtx.refreshPedido()
      } else {
        onUpdate()
      }
    } catch (error) {
      toast.error('Erro ao criar orçamento', {
        description: describeError(error),
      })
    } finally {
      setCreating(false)
    }
  }

  const handleActivate = async (orcamentoId: string) => {
    setActivating(orcamentoId)

    // Optimistic update with handle: mark the selected orcamento as active
    const handle = pedidoCtx?.optimisticUpdate((p) => ({
      ...p,
      orcamentos: p.orcamentos.map((o) => ({
        ...o,
        isAtivo: o.id === orcamentoId,
      })),
    }))

    try {
      const response = await fetch(`/api/pedidos/${pedido.id}/orcamento/${orcamentoId}/ativar`, {
        method: 'PUT',
      })
      await parseApiResponse(response)
      toast.success('Orçamento ativado')

      handle?.commit()
      if (pedidoCtx) {
        await pedidoCtx.refreshPedido()
      } else {
        onUpdate()
      }
    } catch (error) {
      handle?.rollback()
      toast.error('Erro ao ativar orçamento', {
        description: describeError(error),
      })
    } finally {
      setActivating(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Active orçamento */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Orçamento Ativo
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateNew}
            disabled={creating || !activeOrcamento}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Nova Versão
          </Button>
        </div>

        {activeOrcamento ? (
          <OrcamentoCard
            orcamento={activeOrcamento}
            pedidoId={pedido.id}
            showActivateButton={false}
            onView={() => setViewingOrcamento(activeOrcamento)}
            onUpdate={onUpdate}
          />
        ) : (
          <Card className="p-8 text-center">
            <FileTextIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Nenhum orçamento ativo
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione itens ao pedido para criar um orçamento
            </p>
          </Card>
        )}
      </div>

      {/* Historical orçamentos */}
      {historicalOrcamentos.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Histórico de Orçamentos
          </h3>
          <div className="space-y-3">
            {historicalOrcamentos.map((orc) => (
              <OrcamentoCard
                key={orc.id}
                orcamento={orc}
                pedidoId={pedido.id}
                onActivate={() => handleActivate(orc.id)}
                onView={() => setViewingOrcamento(orc)}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Items dialog */}
      <Dialog open={!!viewingOrcamento} onOpenChange={() => setViewingOrcamento(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Orçamento Versão {viewingOrcamento?.versao}
            </DialogTitle>
            <DialogDescription>
              {viewingOrcamento?.itens.length} {viewingOrcamento?.itens.length !== 1 ? 'itens' : 'item'} | Total: {formatPrice(viewingOrcamento?.total ?? 0)}
            </DialogDescription>
          </DialogHeader>
          {viewingOrcamento && (
            <PedidoItemsTable
              items={viewingOrcamento.itens}
              onChange={() => {}}
              readOnly
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
