'use client'

import { PEDIDO_STATUS_LABELS, type PedidoStatus, type EntregaTipo } from '@/types/pedido'
import { PublicEntregaToggle } from './PublicEntregaToggle'
import { PublicPaymentOptions } from './PublicPaymentOptions'

// Types for the public API response (filtered data)
export interface PublicPedidoItem {
  id: string
  produtoId?: string | null
  nome: string
  descricao?: string
  precoUnitario: number
  quantidade: number
  total: number
}

export interface PublicOrcamento {
  id: string
  versao: number
  isAtivo: boolean
  status: string
  itens: PublicPedidoItem[]
  subtotal: number
  desconto: number
  descontoTipo: 'valor' | 'percentual'
  acrescimo: number
  total: number
}

export interface PublicAddress {
  id: string
  label?: string
  cep?: string
  estado?: string
  cidade?: string
  bairro?: string
  endereco?: string
  numero?: string
  complemento?: string
}

export interface PublicEntrega {
  tipo: EntregaTipo
  enderecoEntrega?: PublicAddress
  enderecoEntregaClienteId?: string
  distanciaKm?: number
  custoPorKm: number
  taxaExtra: number
  taxaExtraNota?: string
  freteTotal: number
  enderecoRetiradaId?: string
  enderecoRetiradaNome?: string
}

export interface PublicStoreAddress {
  id: string
  nome: string
  cep?: string
  estado?: string
  cidade?: string
  bairro?: string
  endereco?: string
  numero?: string
  complemento?: string
  isDefault: boolean
}

export interface PublicStoreHours {
  diaSemana: number
  diaSemanaLabel: string
  abreAs: string
  fechaAs: string
  fechado: boolean
}

export interface PublicPedidoData {
  id: string
  numeroPedido: string
  clienteNome: string
  status: PedidoStatus
  orcamento: PublicOrcamento | null
  entrega: PublicEntrega
  dataEntrega?: string | null
  observacoesCliente?: string | null
  createdAt: string
  storeAddresses: PublicStoreAddress[]
  storeHours: PublicStoreHours[]
}

interface PublicPedidoViewProps {
  pedido: PublicPedidoData
  token: string
  onPedidoUpdate: (pedido: PublicPedidoData) => void
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function getStatusColor(status: PedidoStatus): string {
  const colors: Record<PedidoStatus, string> = {
    RASCUNHO: 'bg-gray-100 text-gray-700',
    AGUARDANDO_APROVACAO: 'bg-amber-100 text-amber-700',
    CONFIRMADO: 'bg-blue-100 text-blue-700',
    EM_PRODUCAO: 'bg-purple-100 text-purple-700',
    PRONTO: 'bg-green-100 text-green-700',
    ENTREGUE: 'bg-emerald-100 text-emerald-700',
    CANCELADO: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function PublicPedidoView({ pedido, token, onPedidoUpdate }: PublicPedidoViewProps) {
  const orcamento = pedido.orcamento
  const entrega = pedido.entrega

  const freteDisplay = entrega.tipo === 'ENTREGA' ? entrega.freteTotal : 0
  const grandTotal = (orcamento?.total ?? 0) + freteDisplay

  // Progress steps
  const step1Complete = !!(orcamento && orcamento.itens.length > 0)
  const step2Complete = entrega.tipo === 'RETIRADA'
    ? !!entrega.enderecoRetiradaId
    : !!(entrega.enderecoEntrega || entrega.enderecoEntregaClienteId)

  const handleEntregaUpdate = (newEntrega: PublicEntrega) => {
    onPedidoUpdate({
      ...pedido,
      entrega: newEntrega,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-rose-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-bold">M</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Momento Cake</h1>
              <p className="text-xs text-gray-500">Seu Pedido</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pedido.status)}`}>
            {PEDIDO_STATUS_LABELS[pedido.status]}
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Progress Indicator */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            {/* Step 1: Itens */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step1Complete
                  ? 'bg-rose-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                1
              </div>
              <span className={`text-xs mt-1 ${
                step1Complete
                  ? 'text-rose-600 font-medium'
                  : 'text-gray-400'
              }`}>
                Itens
              </span>
            </div>

            {/* Line 1-2 */}
            <div className={`flex-1 h-0.5 -mt-4 ${
              step2Complete ? 'bg-rose-500' : 'bg-gray-200'
            }`} />

            {/* Step 2: Entrega */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step2Complete
                  ? 'bg-rose-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
              <span className={`text-xs mt-1 ${
                step2Complete
                  ? 'text-rose-600 font-medium'
                  : 'text-gray-400'
              }`}>
                Entrega
              </span>
            </div>

            {/* Line 2-3 */}
            <div className="flex-1 h-0.5 -mt-4 bg-gray-200" />

            {/* Step 3: Pagamento */}
            <div className="flex flex-col items-center flex-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-gray-200 text-gray-500">
                3
              </div>
              <span className="text-xs mt-1 text-gray-400">
                Pagamento
              </span>
            </div>
          </div>
        </div>

        {/* Pedido Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-medium text-gray-500">Pedido</h2>
            <span className="text-sm font-mono text-gray-700">{pedido.numeroPedido}</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{pedido.clienteNome}</p>
        </div>

        {/* Items Table */}
        {orcamento && orcamento.itens.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Itens do Pedido</h3>
            </div>

            {/* Mobile-friendly items */}
            <div className="divide-y divide-gray-50">
              {orcamento.itens.map((item) => (
                <div key={item.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.nome}</p>
                      {item.descricao && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.descricao}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {item.quantidade} x {formatCurrency(item.precoUnitario)}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-100 px-5 py-3 space-y-2 bg-gray-50/50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-700">{formatCurrency(orcamento.subtotal)}</span>
              </div>

              {orcamento.desconto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Desconto</span>
                  <span className="text-green-600">- {formatCurrency(orcamento.desconto)}</span>
                </div>
              )}

              {orcamento.acrescimo > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Acréscimo</span>
                  <span className="text-gray-700">+ {formatCurrency(orcamento.acrescimo)}</span>
                </div>
              )}

              {/* Freight / Pickup line */}
              <div className="flex justify-between text-sm">
                {entrega.tipo === 'ENTREGA' ? (
                  <>
                    <span className="text-gray-500">Frete</span>
                    <span className="text-gray-700">{formatCurrency(entrega.freteTotal)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-500">Retirada</span>
                    <span className="text-green-600">Grátis</span>
                  </>
                )}
              </div>

              {/* Grand Total */}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-base font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-rose-600">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        )}

        {/* No items */}
        {(!orcamento || orcamento.itens.length === 0) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500">Nenhum item neste pedido ainda.</p>
          </div>
        )}

        {/* Delivery / Pickup Toggle */}
        <PublicEntregaToggle
          entrega={entrega}
          token={token}
          storeAddresses={pedido.storeAddresses}
          storeHours={pedido.storeHours}
          onEntregaUpdate={handleEntregaUpdate}
        />

        {/* Payment Options */}
        <PublicPaymentOptions />

        {/* Client Notes */}
        {pedido.observacoesCliente && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Observações</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{pedido.observacoesCliente}</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-rose-100 bg-white mt-8">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <span className="text-sm font-medium text-gray-700">Momento Cake</span>
          </div>
          <p className="text-xs text-gray-400">Feito com carinho para você</p>
        </div>
      </footer>
    </div>
  )
}
