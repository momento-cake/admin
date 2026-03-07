'use client'

import { useState, useEffect } from 'react'
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
import { PedidoStatusBadge } from './PedidoStatusBadge'
import { PedidoStatusFlow } from './PedidoStatusFlow'
import { OrcamentoManager } from './OrcamentoManager'
import { PaymentSection } from './PaymentSection'
import { NfSection } from './NfSection'
import { PacoteManager } from './PacoteManager'
import { EntregaSection } from './EntregaSection'

interface PedidoDetailViewProps {
  pedido: Pedido
  onUpdate: () => void
}

export function PedidoDetailView({ pedido, onUpdate }: PedidoDetailViewProps) {
  const activeOrcamento = pedido.orcamentos.find((o) => o.isAtivo)
  const [clientAddresses, setClientAddresses] = useState<Address[]>([])

  // Fetch client addresses for EntregaSection
  useEffect(() => {
    if (!pedido.clienteId) return
    const loadClientAddresses = async () => {
      try {
        const response = await fetch(`/api/clients/${pedido.clienteId}`)
        const data = await response.json()
        if (data.success && data.data?.addresses) {
          setClientAddresses(data.data.addresses)
        }
      } catch (err) {
        console.error('Erro ao carregar endereços do cliente:', err)
      }
    }
    loadClientAddresses()
  }, [pedido.clienteId])

  const handlePacotesChange = async (pacotes: PedidoPacote[]) => {
    try {
      const response = await fetch(`/api/pedidos/${pedido.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacotes }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      onUpdate()
    } catch (err) {
      console.error('Erro ao salvar embalagens:', err)
    }
  }

  const handleEntregaUpdate = async (entrega: PedidoEntrega) => {
    try {
      const response = await fetch(`/api/pedidos/${pedido.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entrega }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      onUpdate()
    } catch (err) {
      console.error('Erro ao salvar entrega:', err)
    }
  }

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '-'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const formatDateShort = (timestamp: any): string => {
    if (!timestamp) return '-'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  return (
    <div className="space-y-6">
      {/* Header info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <code className="text-lg font-mono font-bold bg-muted px-3 py-1 rounded">
                  {pedido.numeroPedido}
                </code>
                <PedidoStatusBadge status={pedido.status} />
              </div>

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
                <p className="text-2xl font-bold">
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
                <Badge variant="secondary" className="text-[10px] ml-1 py-0 px-1.5">Em Breve</Badge>
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
          <PaymentSection
            pedidoId={pedido.id}
            total={activeOrcamento?.total ?? 0}
          />
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
