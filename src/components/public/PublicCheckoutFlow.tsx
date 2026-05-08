'use client'

import { useState } from 'react'
import { QrCode, CreditCard } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PublicBillingForm, type ConfirmedBilling } from './PublicBillingForm'
import { PublicPixCharge } from './PublicPixCharge'
import { PublicCardCharge } from './PublicCardCharge'
import { PublicPaymentSuccess } from './PublicPaymentSuccess'
import type { PublicPedidoData } from './PublicPedidoView'
import type { NormalizedChargeStatus, PaymentMethod } from '@/lib/payments/types'

const fontBody = { fontFamily: 'var(--font-montserrat), system-ui, sans-serif' }

export interface PublicBillingData {
  nome: string
  cpfCnpj: string
  email: string
  telefone?: string
  confirmedAt?: string
}

export interface PublicPaymentSessionData {
  method?: PaymentMethod
  status: NormalizedChargeStatus
  amount?: number
  pixQrCodeBase64?: string
  pixCopyPaste?: string
  expiresAt?: string
  chargeId?: string
}

/**
 * Extended PublicPedidoData carrying checkout-only fields. Optional so this
 * type is structurally compatible with the existing PublicPedidoData while
 * the integration into PublicPedidoView is finalized.
 */
export interface PublicCheckoutPedido extends PublicPedidoData {
  billing?: PublicBillingData | null
  paymentSession?: PublicPaymentSessionData | null
  totalPago?: number | null
}

interface PublicCheckoutFlowProps {
  pedido: PublicCheckoutPedido
  token: string
  onPedidoUpdate: (updated: Partial<PublicCheckoutPedido>) => void
}

function computeAmountDue(pedido: PublicCheckoutPedido): number {
  const orcamentoTotal = pedido.orcamento?.total ?? 0
  const frete =
    pedido.entrega.tipo === 'ENTREGA' ? pedido.entrega.freteTotal ?? 0 : 0
  const paid = pedido.totalPago ?? 0
  return Math.max(0, orcamentoTotal + frete - paid)
}

export function PublicCheckoutFlow({
  pedido,
  token,
  onPedidoUpdate,
}: PublicCheckoutFlowProps) {
  // Default the active tab to whichever method already has an in-flight
  // session — so a customer who reloaded mid card-review lands on the card
  // tab (where the "em análise" panel lives), not the PIX tab.
  const initialTab: 'pix' | 'card' =
    pedido.paymentSession?.method === 'CARTAO_CREDITO' ? 'card' : 'pix'
  const [tab, setTab] = useState<'pix' | 'card'>(initialTab)

  // 1. Already paid → success screen
  if (pedido.status === 'CONFIRMADO') {
    return (
      <PublicPaymentSuccess
        pedido={{
          numeroPedido: pedido.numeroPedido,
          clienteNome: pedido.clienteNome,
          entrega: { tipo: pedido.entrega.tipo },
        }}
      />
    )
  }

  // 2. Not waiting for payment → render nothing (other UI handles those states)
  if (pedido.status !== 'AGUARDANDO_PAGAMENTO') {
    return null
  }

  // 3. Payment session already CONFIRMED but pedido not yet flipped → success
  if (pedido.paymentSession?.status === 'CONFIRMED') {
    return (
      <PublicPaymentSuccess
        pedido={{
          numeroPedido: pedido.numeroPedido,
          clienteNome: pedido.clienteNome,
          entrega: { tipo: pedido.entrega.tipo },
        }}
      />
    )
  }

  const amountDue = computeAmountDue(pedido)

  // 4. No billing yet → billing form
  if (!pedido.billing) {
    const billingInitial = {
      nome: pedido.clienteNome ?? '',
      cpfCnpj: '',
      email: '',
      telefone: '',
    }
    return (
      <PublicBillingForm
        token={token}
        initial={billingInitial}
        amount={amountDue}
        onConfirmed={(confirmed: ConfirmedBilling) => {
          onPedidoUpdate({
            billing: {
              nome: confirmed.nome,
              cpfCnpj: confirmed.cpfCnpj,
              email: confirmed.email,
              telefone: confirmed.telefone,
              confirmedAt: confirmed.confirmedAt,
            },
          })
        }}
      />
    )
  }

  // 5. Billing present, awaiting payment → method tabs
  const handlePaid = () => {
    onPedidoUpdate({
      status: 'CONFIRMADO',
      paymentSession: pedido.paymentSession
        ? { ...pedido.paymentSession, status: 'CONFIRMED' }
        : { status: 'CONFIRMED' },
    })
  }

  return (
    <div className="space-y-4">
      {/* Step caption — anchors the tabs as "Step 2" of the ritual */}
      <div className="flex items-center justify-center gap-2" aria-hidden="true">
        <span className="h-px w-8 bg-[#d4c4a8]/55" />
        <p
          className="text-[10px] text-[#a89b8a] tracking-[0.32em] uppercase"
          style={fontBody}
        >
          Escolha como pagar
        </p>
        <span className="h-px w-8 bg-[#d4c4a8]/55" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'pix' | 'card')}>
        <TabsList
          className="grid grid-cols-2 w-full bg-gradient-to-b from-[#fffdf8] to-[#faf3e6] border border-[#d4c4a8]/45 h-auto p-1 rounded-2xl shadow-[0_1px_3px_rgba(45,35,25,0.04)]"
        >
          <TabsTrigger
            value="pix"
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-[#8b7e6e] data-[state=active]:bg-white data-[state=active]:text-[#2d2319] data-[state=active]:shadow-[0_2px_8px_-2px_rgba(184,149,106,0.25)] data-[state=active]:border data-[state=active]:border-[#d4c4a8]/50 transition-all"
            style={fontBody}
          >
            <QrCode className="h-4 w-4" />
            <span className="text-sm font-medium tracking-wide">PIX</span>
          </TabsTrigger>
          <TabsTrigger
            value="card"
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-[#8b7e6e] data-[state=active]:bg-white data-[state=active]:text-[#2d2319] data-[state=active]:shadow-[0_2px_8px_-2px_rgba(184,149,106,0.25)] data-[state=active]:border data-[state=active]:border-[#d4c4a8]/50 transition-all"
            style={fontBody}
          >
            <CreditCard className="h-4 w-4" />
            <span className="text-sm font-medium tracking-wide">Cartão de Crédito</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pix" className="mt-4 focus-visible:outline-none">
          <PublicPixCharge
            token={token}
            amount={amountDue}
            onPaid={handlePaid}
            existingSession={
              pedido.paymentSession && pedido.paymentSession.method === 'PIX'
                ? {
                    pixQrCodeBase64: pedido.paymentSession.pixQrCodeBase64,
                    pixCopyPaste: pedido.paymentSession.pixCopyPaste,
                    expiresAt: pedido.paymentSession.expiresAt,
                    status: pedido.paymentSession.status,
                  }
                : null
            }
          />
        </TabsContent>

        <TabsContent value="card" className="mt-4 focus-visible:outline-none">
          <PublicCardCharge
            token={token}
            billing={{
              nome: pedido.billing.nome,
              cpfCnpj: pedido.billing.cpfCnpj,
              email: pedido.billing.email,
              telefone: pedido.billing.telefone,
            }}
            amount={amountDue}
            onPaid={handlePaid}
            existingSession={
              pedido.paymentSession &&
              pedido.paymentSession.method === 'CARTAO_CREDITO'
                ? { status: pedido.paymentSession.status }
                : null
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
