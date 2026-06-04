'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Pencil, Loader2, FileText as FileTextIcon } from 'lucide-react'
import { Orcamento, PedidoItem, DescontoTipo, Pedido } from '@/types/pedido'
import { parseApiResponse, describeError } from '@/lib/error-handler'
import { usePedidoOptional } from '@/contexts/PedidoContext'
import { OrcamentoCard } from './OrcamentoCard'
import { PedidoItemsTable } from './PedidoItemsTable'
import { formatPrice } from '@/lib/products'
import { cn } from '@/lib/utils'

interface OrcamentoManagerProps {
  pedido: Pedido
  onUpdate: () => void
}

export function OrcamentoManager({ pedido, onUpdate }: OrcamentoManagerProps) {
  const pedidoCtx = usePedidoOptional()
  const [, setActivating] = useState<string | null>(null)
  const [viewingOrcamento, setViewingOrcamento] = useState<Orcamento | null>(null)

  // Edit-items dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editItems, setEditItems] = useState<PedidoItem[]>([])
  const [editDesconto, setEditDesconto] = useState(0)
  const [editDescontoTipo, setEditDescontoTipo] = useState<DescontoTipo>('valor')
  const [editAcrescimo, setEditAcrescimo] = useState(0)

  const activeOrcamento = pedido.orcamentos.find((o) => o.isAtivo)
  const historicalOrcamentos = pedido.orcamentos
    .filter((o) => !o.isAtivo)
    .sort((a, b) => b.versao - a.versao)

  // Editing a delivered order would reopen its balance and break the
  // fully-paid ENTREGUE invariant, so item edits are disabled once delivered.
  const editDisabled = pedido.status === 'ENTREGUE'

  const editSubtotal = editItems.reduce((sum, item) => sum + item.total, 0)
  const editDescontoValor =
    editDescontoTipo === 'percentual' ? editSubtotal * (editDesconto / 100) : editDesconto
  const editTotal = Math.max(0, editSubtotal - editDescontoValor + editAcrescimo)

  const openEdit = () => {
    setEditItems(activeOrcamento ? activeOrcamento.itens.map((i) => ({ ...i })) : [])
    setEditDesconto(activeOrcamento?.desconto ?? 0)
    setEditDescontoTipo(activeOrcamento?.descontoTipo ?? 'valor')
    setEditAcrescimo(activeOrcamento?.acrescimo ?? 0)
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (editItems.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido')
      return
    }

    setSavingEdit(true)
    try {
      // 1. Create a new orcamento version with the edited items.
      const createResponse = await fetch(`/api/pedidos/${pedido.id}/orcamento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens: editItems,
          desconto: editDesconto,
          descontoTipo: editDescontoTipo,
          acrescimo: editAcrescimo,
        }),
      })
      const newOrcamento = await parseApiResponse<{ id: string }>(createResponse)

      // 2. Activate it so it becomes the order's current quote.
      const activateResponse = await fetch(
        `/api/pedidos/${pedido.id}/orcamento/${newOrcamento.id}/ativar`,
        { method: 'PUT' }
      )
      await parseApiResponse(activateResponse)

      toast.success('Itens do pedido atualizados')
      setEditOpen(false)

      if (pedidoCtx) {
        await pedidoCtx.refreshPedido()
      } else {
        onUpdate()
      }
    } catch (error) {
      toast.error('Erro ao atualizar itens', {
        description: describeError(error),
      })
    } finally {
      setSavingEdit(false)
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
            onClick={openEdit}
            disabled={editDisabled}
            title={editDisabled ? 'Pedido entregue não pode ser editado' : undefined}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar Itens
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

      {/* Edit-items dialog → saves as a new active version */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!savingEdit) setEditOpen(open) }}>
        <DialogContent className="w-full sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Itens do Pedido</DialogTitle>
            <DialogDescription>
              As alterações criam uma nova versão do orçamento, que passa a ser a ativa.
              O saldo a pagar é recalculado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <PedidoItemsTable items={editItems} onChange={setEditItems} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Desconto</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editDesconto}
                    onChange={(e) => setEditDesconto(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="flex-1 h-8 text-sm"
                  />
                  <div className="flex border rounded-md overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setEditDescontoTipo('valor')}
                      className={cn(
                        'px-2 py-1 text-xs font-medium transition-colors',
                        editDescontoTipo === 'valor'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background hover:bg-muted'
                      )}
                    >
                      R$
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditDescontoTipo('percentual')}
                      className={cn(
                        'px-2 py-1 text-xs font-medium transition-colors',
                        editDescontoTipo === 'percentual'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background hover:bg-muted'
                      )}
                    >
                      %
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Acréscimo</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editAcrescimo}
                    onChange={(e) => setEditAcrescimo(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(editSubtotal)}</span>
              </div>
              {editDescontoValor > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Desconto</span>
                  <span>- {formatPrice(editDescontoValor)}</span>
                </div>
              )}
              {editAcrescimo > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Acréscimo</span>
                  <span>+ {formatPrice(editAcrescimo)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-1 mt-1">
                <span>Total</span>
                <span>{formatPrice(editTotal)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit || editItems.length === 0}>
              {savingEdit && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Items view dialog */}
      <Dialog open={!!viewingOrcamento} onOpenChange={() => setViewingOrcamento(null)}>
        <DialogContent className="w-full sm:max-w-3xl max-h-[80vh] overflow-y-auto">
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
