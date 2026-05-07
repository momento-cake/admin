'use client'

import { useState, useEffect, useRef } from 'react'
import { PEDIDO_STATUS_LABELS, type PedidoStatus, type EntregaTipo } from '@/types/pedido'
import { PublicEntregaToggle } from './PublicEntregaToggle'
import { PublicCheckoutFlow, type PublicBillingData, type PublicPaymentSessionData } from './PublicCheckoutFlow'
import { ArrowRight, Loader2, Calendar, Sparkles, MessageSquare, Package } from 'lucide-react'
import { toast } from 'sonner'
import {
  describeError,
  logError,
  parseApiResponse,
} from '@/lib/error-handler'

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
  billing?: PublicBillingData | null
  paymentSession?: PublicPaymentSessionData | null
  totalPago?: number | null
  paidAt?: string | null
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

function formatDate(dateStr: string): string {
  // Handle both 'YYYY-MM-DD' and ISO strings like '2026-03-15T14:00:00.000Z'
  const date = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T00:00:00')
  if (isNaN(date.getTime())) return dateStr // fallback to raw string if invalid
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function getStatusConfig(status: PedidoStatus): { bg: string; text: string; dot: string } {
  const configs: Record<PedidoStatus, { bg: string; text: string; dot: string }> = {
    RASCUNHO: { bg: 'bg-stone-100', text: 'text-stone-600', dot: 'bg-stone-400' },
    AGUARDANDO_APROVACAO: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
    CONFIRMADO: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
    AGUARDANDO_PAGAMENTO: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
    EM_PRODUCAO: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400' },
    PRONTO: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-400' },
    ENTREGUE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
    CANCELADO: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
  }
  return configs[status] || configs.RASCUNHO
}

// Ornamental divider SVG
function OrnamentalDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden="true">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#d4c4a8] to-transparent" />
      <svg width="24" height="12" viewBox="0 0 24 12" fill="none" className="text-[#c9a96e] flex-shrink-0">
        <path d="M12 0C8 0 5 3 2 6C5 9 8 12 12 12C16 12 19 9 22 6C19 3 16 0 12 0Z" fill="currentColor" opacity="0.2" />
        <circle cx="12" cy="6" r="2" fill="currentColor" />
      </svg>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#d4c4a8] to-transparent" />
    </div>
  )
}

// Confetti particle for celebration
function ConfettiParticle({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <div
      className="absolute top-0 opacity-0 animate-confetti-fall pointer-events-none"
      style={{
        left: `${x}%`,
        animationDelay: `${delay}ms`,
        color,
      }}
    >
      <div
        className="w-2 h-2 rounded-sm animate-confetti-spin"
        style={{ backgroundColor: 'currentColor' }}
      />
    </div>
  )
}

export function PublicPedidoView({ pedido, token, onPedidoUpdate }: PublicPedidoViewProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [mounted, setMounted] = useState(false)
  const confirmingRef = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const orcamento = pedido.orcamento
  const entrega = pedido.entrega

  const freteDisplay = entrega.tipo === 'ENTREGA' ? entrega.freteTotal : 0
  const grandTotal = (orcamento?.total ?? 0) + freteDisplay
  const statusConfig = getStatusConfig(pedido.status)

  const handleConfirm = async () => {
    if (confirmingRef.current) return
    confirmingRef.current = true
    setIsConfirming(true)
    try {
      const response = await fetch(`/api/public/pedidos/${token}/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await parseApiResponse<PublicPedidoData>(response)

      setShowConfetti(true)
      toast.success('Pedido confirmado! Vamos para o pagamento.')
      onPedidoUpdate(data)

      setTimeout(() => setShowConfetti(false), 4000)
    } catch (err) {
      logError('PublicPedidoView.handleConfirm', err)
      toast.error('Erro ao confirmar pedido', {
        description: describeError(err),
      })
    } finally {
      setIsConfirming(false)
      confirmingRef.current = false
    }
  }

  return (
    <div className="min-h-screen linen-bg relative overflow-x-hidden">
        {/* Confetti overlay */}
        {showConfetti && (
          <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden" aria-hidden="true">
            {Array.from({ length: 30 }).map((_, i) => (
              <ConfettiParticle
                key={i}
                delay={i * 80}
                x={Math.random() * 100}
                color={['#b8956a', '#e8c87a', '#d4a574', '#c9a96e', '#8b7355', '#5c8a4d'][i % 6]}
              />
            ))}
          </div>
        )}

        {/* Decorative top accent line */}
        <div className="h-1 bg-gradient-to-r from-[#b8956a] via-[#e8c87a] to-[#b8956a]" aria-hidden="true" />

        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-[#d4c4a8]/20 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              {/* Logo mark */}
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#b8956a] to-[#8b7355] flex items-center justify-center shadow-sm">
                  <span
                    className="text-white text-lg tracking-tight"
                    style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
                  >
                    M
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#e8c87a] flex items-center justify-center">
                  <Sparkles className="w-2.5 h-2.5 text-[#5c4a2e]" />
                </div>
              </div>
              <div>
                <h1
                  className="text-lg text-[#2d2319] tracking-wide"
                  style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 600 }}
                >
                  Momento Cake
                </h1>
                <p
                  className="text-[11px] text-[#8b7e6e] tracking-widest uppercase"
                  style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
                >
                  Confeitaria Artesanal
                </p>
              </div>
            </div>

            {/* Status badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium tracking-wide ${statusConfig.bg} ${statusConfig.text}`}
              style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
              {PEDIDO_STATUS_LABELS[pedido.status]}
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-2xl mx-auto px-5 py-8 space-y-6">
          {/* Greeting & Order Info Card */}
          <div
            className={`premium-card p-6 ${mounted ? 'animate-fade-in-up stagger-1' : 'opacity-0'}`}
          >
            <div className="text-center mb-4">
              <p
                className="text-sm text-[#8b7e6e] tracking-wide mb-1"
                style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
              >
                Pedido {pedido.numeroPedido}
              </p>
              <h2
                className="text-2xl text-[#2d2319] mb-0.5"
                style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 600 }}
              >
                {pedido.clienteNome}
              </h2>
            </div>

            <OrnamentalDivider className="my-4" />

            {/* Delivery Date */}
            {pedido.dataEntrega && (
              <div className="flex items-center justify-center gap-2.5 mt-2">
                <Calendar className="h-4 w-4 text-[#b8956a]" />
                <span
                  className="text-sm text-[#5c4a2e]"
                  style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
                >
                  {formatDate(pedido.dataEntrega)}
                </span>
              </div>
            )}
          </div>

          {/* Items Section */}
          {orcamento && orcamento.itens.length > 0 && (
            <div
              className={`premium-card overflow-hidden ${mounted ? 'animate-fade-in-up stagger-2' : 'opacity-0'}`}
            >
              {/* Section Header */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-[#b8956a]" />
                  <h3
                    className="text-base text-[#2d2319] tracking-wide"
                    style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 600 }}
                  >
                    Itens do Pedido
                  </h3>
                </div>
              </div>

              {/* Items list - menu style */}
              <div className="px-6 space-y-0">
                {orcamento.itens.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`py-4 ${idx < orcamento.itens.length - 1 ? 'border-b border-[#d4c4a8]/15' : ''}`}
                    style={{
                      animationDelay: mounted ? `${0.15 + idx * 0.06}s` : '0s',
                    }}
                  >
                    {/* Item name and price on same line, connected by dots */}
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span
                        className="text-[15px] text-[#2d2319] min-w-0"
                        style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif', fontWeight: 500 }}
                      >
                        {item.nome}
                      </span>
                      {/* Dotted leader */}
                      <span
                        className="flex-1 border-b border-dotted border-[#d4c4a8]/40 mb-1 min-w-[12px] shrink-[999]"
                        aria-hidden="true"
                      />
                      <span
                        className="text-[15px] text-[#2d2319] flex-shrink-0 tabular-nums whitespace-nowrap"
                        style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif', fontWeight: 500 }}
                      >
                        {formatCurrency(item.total)}
                      </span>
                    </div>

                    {/* Description */}
                    {item.descricao && (
                      <p
                        className="text-[13px] text-[#8b7e6e] mt-1 leading-relaxed line-clamp-2"
                        style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
                      >
                        {item.descricao}
                      </p>
                    )}

                    {/* Quantity detail */}
                    <p
                      className="text-[12px] text-[#a89b8a] mt-1 tabular-nums"
                      style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
                    >
                      {item.quantidade} {item.quantidade > 1 ? 'unidades' : 'unidade'} &middot; {formatCurrency(item.precoUnitario)} cada
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals section */}
              <div className="bg-[#faf7f2] border-t border-[#d4c4a8]/20 px-6 py-5 space-y-2.5">
                <div
                  className="flex justify-between text-sm"
                  style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
                >
                  <span className="text-[#8b7e6e]">Subtotal</span>
                  <span className="text-[#5c4a2e] tabular-nums">{formatCurrency(orcamento.subtotal)}</span>
                </div>

                {orcamento.desconto > 0 && (
                  <div
                    className="flex justify-between text-sm"
                    style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
                  >
                    <span className="text-emerald-600">Desconto</span>
                    <span className="text-emerald-600 tabular-nums">- {formatCurrency(orcamento.desconto)}</span>
                  </div>
                )}

                {orcamento.acrescimo > 0 && (
                  <div
                    className="flex justify-between text-sm"
                    style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
                  >
                    <span className="text-[#8b7e6e]">Acréscimo</span>
                    <span className="text-[#5c4a2e] tabular-nums">+ {formatCurrency(orcamento.acrescimo)}</span>
                  </div>
                )}

                {/* Freight / Pickup */}
                <div
                  className="flex justify-between text-sm"
                  style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
                >
                  {entrega.tipo === 'ENTREGA' ? (
                    <>
                      <span className="text-[#8b7e6e]">Frete</span>
                      <span className="text-[#5c4a2e] tabular-nums">{formatCurrency(entrega.freteTotal)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[#8b7e6e]">Retirada</span>
                      <span className="text-emerald-600 font-medium">Grátis</span>
                    </>
                  )}
                </div>

                {/* Grand Total */}
                <div className="pt-3 border-t border-[#d4c4a8]/30">
                  <div className="flex justify-between items-baseline">
                    <span
                      className="text-base text-[#2d2319]"
                      style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 600 }}
                    >
                      Total
                    </span>
                    <span
                      className="text-2xl gold-shimmer"
                      style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 700 }}
                    >
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No items */}
          {(!orcamento || orcamento.itens.length === 0) && (
            <div
              className={`premium-card p-10 text-center ${mounted ? 'animate-fade-in-up stagger-2' : 'opacity-0'}`}
            >
              <div className="w-14 h-14 rounded-full bg-[#f5f0eb] flex items-center justify-center mx-auto mb-4">
                <Package className="w-6 h-6 text-[#b8956a]" />
              </div>
              <p
                className="text-[#8b7e6e] text-sm"
                style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
              >
                Nenhum item neste pedido ainda.
              </p>
            </div>
          )}

          {/* Delivery / Pickup — display only. The admin sets this internally; the customer cannot change it from here. */}
          <div className={`${mounted ? 'animate-fade-in-up stagger-4' : 'opacity-0'}`}>
            <PublicEntregaToggle
              entrega={entrega}
              storeAddresses={pedido.storeAddresses}
              storeHours={pedido.storeHours}
            />
          </div>

          {/* Client Notes */}
          {pedido.observacoesCliente && (
            <div
              className={`premium-card p-6 ${mounted ? 'animate-fade-in-up stagger-5' : 'opacity-0'}`}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <MessageSquare className="w-4 h-4 text-[#b8956a]" />
                <h3
                  className="text-base text-[#2d2319] tracking-wide"
                  style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 600 }}
                >
                  Observações
                </h3>
              </div>
              <p
                className="text-sm text-[#5c4a2e] leading-relaxed whitespace-pre-wrap pl-[26px]"
                style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
              >
                {pedido.observacoesCliente}
              </p>
            </div>
          )}

          {/* Confirm Button — moves the pedido to AGUARDANDO_PAGAMENTO and reveals the checkout flow below */}
          {pedido.status === 'AGUARDANDO_APROVACAO' && (
            <div className={`pt-2 pb-4 ${mounted ? 'animate-fade-in-up stagger-6' : 'opacity-0'}`}>
              <button
                onClick={handleConfirm}
                disabled={isConfirming}
                className="confirm-btn w-full py-4 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-base font-semibold tracking-wide">Confirmando...</span>
                  </>
                ) : (
                  <>
                    <span className="text-base font-semibold tracking-wide">Confirmar e ir para Pagamento</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
              <p
                className="text-center text-[11px] text-[#a89b8a] mt-3 tracking-wide"
                style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
              >
                Após confirmar, você poderá pagar via PIX ou cartão de crédito
              </p>
            </div>
          )}

          {/* Checkout Flow — billing form, PIX/Card tabs, or success screen.
              Renders nothing for statuses other than AGUARDANDO_PAGAMENTO and CONFIRMADO. */}
          {(pedido.status === 'AGUARDANDO_PAGAMENTO' || pedido.status === 'CONFIRMADO') && (
            <div className={`${mounted ? 'animate-fade-in-up stagger-6' : 'opacity-0'}`}>
              <PublicCheckoutFlow
                pedido={pedido}
                token={token}
                onPedidoUpdate={(partial) => onPedidoUpdate({ ...pedido, ...partial })}
              />
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-12 pb-10">
          <OrnamentalDivider className="max-w-2xl mx-auto px-5 mb-8" />
          <div className="max-w-2xl mx-auto px-5 text-center">
            <div className="flex items-center justify-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#b8956a] to-[#8b7355] flex items-center justify-center">
                <span
                  className="text-white text-xs"
                  style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 600 }}
                >
                  M
                </span>
              </div>
              <span
                className="text-sm text-[#5c4a2e] tracking-wide"
                style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 500 }}
              >
                Momento Cake
              </span>
            </div>
            <p
              className="text-[11px] text-[#a89b8a] tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
            >
              Feito com carinho para você
            </p>
          </div>
        </footer>
      </div>
  )
}
