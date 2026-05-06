'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Package,
  Truck,
  CreditCard,
  Receipt,
  UserCheck,
  Calendar,
  Clock,
} from 'lucide-react'
import {
  Pedido,
  PedidoPacote,
  PedidoEntrega,
  ENTREGA_TIPO_LABELS,
} from '@/types/pedido'
import { Address } from '@/types/client'
import { formatPrice } from '@/lib/products'
import {
  parseApiResponse,
  describeError,
  formatErrorMessage,
  logError,
} from '@/lib/error-handler'
import { usePedidoOptional } from '@/contexts/PedidoContext'
import { PedidoStatusBadge } from './PedidoStatusBadge'
import { PedidoStatusFlow } from './PedidoStatusFlow'
import { OrcamentoManager } from './OrcamentoManager'
import { PaymentSection } from './PaymentSection'
import { NfSection } from './NfSection'
import { PacoteManager } from './PacoteManager'
import { EntregaSection } from './EntregaSection'
import { ShareOrderButton } from './ShareOrderButton'
import { PedidoCheckoutCard } from './PedidoCheckoutCard'

const CUSTOMER_HANDOFF_STATUSES = new Set([
  'AGUARDANDO_APROVACAO',
  'AGUARDANDO_PAGAMENTO',
])

const SHARE_PROMPT_BY_STATUS: Record<string, string> = {
  AGUARDANDO_APROVACAO: 'Cliente revisando — envie o link se ainda não enviou.',
  AGUARDANDO_PAGAMENTO: 'Cliente confirmou. Aguardando pagamento.',
}

interface PedidoDetailViewProps {
  pedido: Pedido
  onUpdate: () => void
}

export function PedidoDetailView({ pedido, onUpdate }: PedidoDetailViewProps) {
  const activeOrcamento = pedido.orcamentos.find((o) => o.isAtivo)
  const pedidoCtx = usePedidoOptional()
  const [clientAddresses, setClientAddresses] = useState<Address[]>([])

  // Fetch client addresses for EntregaSection
  useEffect(() => {
    if (!pedido.clienteId) return
    const loadClientAddresses = async () => {
      try {
        const response = await fetch(`/api/clients/${pedido.clienteId}`)
        const data = await parseApiResponse<{ addresses?: Address[] }>(response)
        if (data?.addresses) {
          setClientAddresses(data.addresses)
        } else {
          setClientAddresses([])
        }
      } catch (err) {
        console.error('Erro ao carregar endereços do cliente:', err)
        logError('PedidoDetailView.loadClientAddresses', err)
        toast.error('Erro ao carregar endereços do cliente', {
          description: formatErrorMessage(err),
        })
      }
    }
    loadClientAddresses()
  }, [pedido.clienteId])

  const handlePacotesChange = async (pacotes: PedidoPacote[]) => {
    // Optimistically update via context so the children re-render immediately;
    // capture the rollback handle to revert on failure.
    const handle = pedidoCtx?.optimisticUpdate((p) => ({ ...p, pacotes }))
    try {
      const response = await fetch(`/api/pedidos/${pedido.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacotes }),
      })
      await parseApiResponse(response)
      handle?.commit()
      onUpdate()
    } catch (err) {
      handle?.rollback()
      logError('PedidoDetailView.handlePacotesChange', err)
      toast.error('Erro ao salvar embalagens', {
        description: describeError(err),
      })
      throw err
    }
  }

  const handleEntregaUpdate = async (entrega: PedidoEntrega) => {
    // EntregaSection has already applied its own optimistic update against the
    // context before calling us. We don't stack a second optimistic mutation —
    // we just persist and re-throw so EntregaSection can rollback its handle.
    try {
      const response = await fetch(`/api/pedidos/${pedido.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entrega }),
      })
      await parseApiResponse(response)
      onUpdate()
    } catch (err) {
      logError('PedidoDetailView.handleEntregaUpdate', err)
      toast.error('Erro ao salvar entrega', {
        description: describeError(err),
      })
      throw err
    }
  }

  const parseTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null
    if (timestamp.toDate) return timestamp.toDate()
    if (timestamp._seconds !== undefined) return new Date(timestamp._seconds * 1000)
    const d = new Date(timestamp)
    return isNaN(d.getTime()) ? null : d
  }

  const formatDate = (timestamp: any): string => {
    const date = parseTimestamp(timestamp)
    if (!date) return '-'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const formatDateShort = (timestamp: any): string => {
    const date = parseTimestamp(timestamp)
    if (!date) return '-'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  const isCustomerHandoff = CUSTOMER_HANDOFF_STATUSES.has(pedido.status)

  return (
    <div className="space-y-6">
      {/* Header info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <code className="text-lg font-mono font-bold bg-muted px-3 py-1 rounded">
                  {pedido.numeroPedido}
                </code>
                <PedidoStatusBadge status={pedido.status} />
                {isCustomerHandoff && (
                  <ShareOrderButton
                    publicToken={pedido.publicToken}
                    pedidoStatus={pedido.status}
                    clienteNome={pedido.clienteNome}
                    numeroPedido={pedido.numeroPedido}
                    variant="primary"
                  />
                )}
              </div>

              {isCustomerHandoff && (
                <p className="text-xs text-muted-foreground">
                  {SHARE_PROMPT_BY_STATUS[pedido.status]}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <UserCheck className="h-4 w-4" />
                  {pedido.clienteNome}
                  {pedido.clienteTelefone && (
                    <span className="ml-1">- {pedido.clienteTelefone}</span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Criado em {formatDate(pedido.createdAt)}
                </span>
                {pedido.dataEntrega && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Entrega: {formatDateShort(pedido.dataEntrega)}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              {activeOrcamento && (
                <p className="text-2xl font-bold tabular-nums">
                  {formatPrice(activeOrcamento.total)}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {ENTREGA_TIPO_LABELS[pedido.entrega.tipo]}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Status flow */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Alterar Status
            </p>
            <PedidoStatusFlow
              pedidoId={pedido.id}
              currentStatus={pedido.status}
              onStatusChange={() => onUpdate()}
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer self-service status (billing + payment session) */}
      <PedidoCheckoutCard pedido={pedido} />

      {/* Tabs */}
      <Tabs defaultValue="orcamento">
        <div className="relative">
          <div className="overflow-x-auto scrollbar-hide">
            <TabsList className="w-max">
              <TabsTrigger value="orcamento" className="gap-1 flex-shrink-0">
                <FileText className="h-4 w-4" />
                Orçamento
              </TabsTrigger>
              <TabsTrigger value="embalagem" className="gap-1 flex-shrink-0">
                <Package className="h-4 w-4" />
                Embalagem
              </TabsTrigger>
              <TabsTrigger value="entrega" className="gap-1 flex-shrink-0">
                <Truck className="h-4 w-4" />
                Entrega
              </TabsTrigger>
              <TabsTrigger value="pagamento" className="gap-1 flex-shrink-0">
                <CreditCard className="h-4 w-4" />
                Pagamento
              </TabsTrigger>
              <TabsTrigger value="nf" className="gap-1 flex-shrink-0">
                <Receipt className="h-4 w-4" />
                NF
                <Badge variant="secondary" className="text-[10px] ml-1 py-0 px-1.5">Em Breve</Badge>
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none md:hidden" />
        </div>

        {/* Orçamento tab */}
        <TabsContent value="orcamento" className="mt-4">
          <OrcamentoManager pedido={pedido} onUpdate={onUpdate} />
        </TabsContent>

        {/* Embalagem tab (internal) */}
        <TabsContent value="embalagem" className="mt-4">
          <PacoteManager
            pacotes={pedido.pacotes}
            activeItems={activeOrcamento?.itens || []}
            onChange={handlePacotesChange}
          />
        </TabsContent>

        {/* Entrega tab */}
        <TabsContent value="entrega" className="mt-4">
          <EntregaSection
            pedidoId={pedido.id}
            entrega={pedido.entrega}
            clientAddresses={clientAddresses}
            onUpdate={handleEntregaUpdate}
          />
        </TabsContent>

        {/* Pagamento tab */}
        <TabsContent value="pagamento" className="mt-4">
          <PaymentSection pedido={pedido} onUpdate={onUpdate} />
        </TabsContent>

        {/* NF tab */}
        <TabsContent value="nf" className="mt-4">
          <NfSection pedido={pedido} />
        </TabsContent>
      </Tabs>

      {/* Notes */}
      {(pedido.observacoes || pedido.observacoesCliente) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pedido.observacoes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Internas (não visível ao cliente)
                </p>
                <p className="text-sm whitespace-pre-wrap">{pedido.observacoes}</p>
              </div>
            )}
            {pedido.observacoesCliente && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Para o Cliente
                </p>
                <p className="text-sm whitespace-pre-wrap">{pedido.observacoesCliente}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
