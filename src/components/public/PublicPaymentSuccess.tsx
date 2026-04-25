'use client'

import { CheckCircle2, Truck, Store } from 'lucide-react'
import type { EntregaTipo } from '@/types/pedido'

const fontBody = { fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }
const fontHeading = { fontFamily: 'var(--font-playfair), Georgia, serif' }

interface PublicPaymentSuccessProps {
  pedido: {
    numeroPedido: string
    clienteNome: string
    entrega: { tipo: EntregaTipo }
  }
}

export function PublicPaymentSuccess({ pedido }: PublicPaymentSuccessProps) {
  const isDelivery = pedido.entrega.tipo === 'ENTREGA'
  const nextStepsMessage = isDelivery
    ? 'Vamos te avisar quando seu pedido estiver pronto.'
    : 'Vamos te avisar quando estiver pronto para retirada.'

  return (
    <div className="premium-card overflow-hidden" role="status" aria-live="polite">
      <div className="bg-gradient-to-r from-emerald-50 via-emerald-50/60 to-transparent p-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center animate-celebrate-check">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h3
            className="text-2xl text-emerald-800"
            style={{ ...fontHeading, fontWeight: 600 }}
          >
            Pagamento confirmado!
          </h3>
          <p className="text-sm text-emerald-700/80" style={fontBody}>
            Pedido <span className="font-semibold">{pedido.numeroPedido}</span>
          </p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        <div className="text-center">
          <p className="text-sm text-[#5c4a2e] leading-relaxed" style={fontBody}>
            Obrigada, <span className="font-medium">{pedido.clienteNome}</span>!
          </p>
        </div>

        <div className="bg-[#faf7f2] rounded-xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#b8956a]/10 flex items-center justify-center flex-shrink-0">
            {isDelivery ? (
              <Truck className="h-4 w-4 text-[#b8956a]" />
            ) : (
              <Store className="h-4 w-4 text-[#b8956a]" />
            )}
          </div>
          <p className="text-[13px] text-[#5c4a2e] leading-relaxed" style={fontBody}>
            {nextStepsMessage}
          </p>
        </div>
      </div>
    </div>
  )
}
