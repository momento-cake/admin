'use client'

import { useEffect, useState } from 'react'
import { Check, Truck, Store, Sparkles } from 'lucide-react'
import type { EntregaTipo } from '@/types/pedido'

// Hand-arranged confetti scatter — deterministic so it stays pure and so the
// burst feels intentional, not noisy.
const CONFETTI_SCATTER: ReadonlyArray<{
  key: number
  delay: number
  x: number
  color: string
}> = [
  { key: 0, delay: 0, x: 6, color: '#b8956a' },
  { key: 1, delay: 80, x: 92, color: '#e8c87a' },
  { key: 2, delay: 160, x: 22, color: '#d4a574' },
  { key: 3, delay: 240, x: 68, color: '#c9a96e' },
  { key: 4, delay: 320, x: 44, color: '#8b7355' },
  { key: 5, delay: 400, x: 12, color: '#5c8a4d' },
  { key: 6, delay: 480, x: 80, color: '#b8956a' },
  { key: 7, delay: 560, x: 34, color: '#e8c87a' },
  { key: 8, delay: 640, x: 56, color: '#d4a574' },
  { key: 9, delay: 720, x: 18, color: '#c9a96e' },
  { key: 10, delay: 800, x: 88, color: '#8b7355' },
  { key: 11, delay: 880, x: 50, color: '#5c8a4d' },
  { key: 12, delay: 960, x: 28, color: '#b8956a' },
  { key: 13, delay: 1040, x: 74, color: '#e8c87a' },
  { key: 14, delay: 1120, x: 40, color: '#d4a574' },
  { key: 15, delay: 1200, x: 62, color: '#c9a96e' },
  { key: 16, delay: 1280, x: 8, color: '#8b7355' },
  { key: 17, delay: 1360, x: 96, color: '#5c8a4d' },
]

const fontBody = { fontFamily: 'var(--font-montserrat), system-ui, sans-serif' }
const fontHeading = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

interface PublicPaymentSuccessProps {
  pedido: {
    numeroPedido: string
    clienteNome: string
    entrega: { tipo: EntregaTipo }
  }
}

/**
 * Sealing-wax confetti — gold sparks + warm browns. Reused vocabulary from
 * PublicPedidoView's confetti, but bursts only briefly then settles.
 */
function ConfettiSpark({
  delay,
  x,
  color,
}: {
  delay: number
  x: number
  color: string
}) {
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

export function PublicPaymentSuccess({ pedido }: PublicPaymentSuccessProps) {
  const isDelivery = pedido.entrega.tipo === 'ENTREGA'
  const nextStepsMessage = isDelivery
    ? 'Vamos te avisar quando seu pedido estiver pronto.'
    : 'Vamos te avisar quando estiver pronto para retirada.'

  // Confetti only on the moment of mount.
  const [showConfetti, setShowConfetti] = useState(true)
  useEffect(() => {
    const id = window.setTimeout(() => setShowConfetti(false), 3500)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div
      className="premium-card overflow-hidden relative animate-page-turn"
      role="status"
      aria-live="polite"
    >
      {/* Soft gold corner glows — adds the "thank-you card" warmth */}
      <div
        className="pointer-events-none absolute -top-16 -left-16 w-48 h-48 rounded-full opacity-60"
        style={{
          background:
            'radial-gradient(circle, rgba(232,200,122,0.35) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 -right-20 w-56 h-56 rounded-full opacity-50"
        style={{
          background:
            'radial-gradient(circle, rgba(184,149,106,0.25) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Mount-time confetti burst — bursts inside the card, scoped */}
      {showConfetti && (
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          {CONFETTI_SCATTER.map((s) => (
            <ConfettiSpark
              key={s.key}
              delay={s.delay}
              x={s.x}
              color={s.color}
            />
          ))}
        </div>
      )}

      {/* Sealing-wax stamp + ornamental ribbon */}
      <div className="relative pt-9 pb-3 px-6 flex flex-col items-center text-center">
        {/* Wax-seal style check — gradient anchored on the brand gold #C9A96E */}
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center animate-celebrate-check"
            style={{
              background:
                'radial-gradient(circle at 32% 28%, #F5EDE4 0%, #D4B97A 40%, #B8965A 100%)',
              boxShadow:
                '0 1px 0 rgba(255,255,255,0.65) inset, 0 -1px 0 rgba(44,24,16,0.25) inset, 0 4px 22px -4px rgba(201,169,110,0.55)',
            }}
          >
            <div
              className="w-14 h-14 rounded-full border border-[#8B6F4E]/40 flex items-center justify-center"
              style={{
                background:
                  'radial-gradient(circle at 35% 30%, #C9A96E 0%, #8B6F4E 100%)',
              }}
            >
              <Check className="h-7 w-7 text-[#FBF8F4]" strokeWidth={2.5} />
            </div>
          </div>
          {/* tiny gold sparkle accents — kept; brand-tinted */}
          <Sparkles
            className="absolute -top-1 -right-2 w-3.5 h-3.5 text-[#C9A96E] animate-fade-in"
            aria-hidden="true"
          />
          <Sparkles
            className="absolute -bottom-1 -left-2 w-3 h-3 text-[#B8965A] animate-fade-in"
            style={{ animationDelay: '0.3s' }}
            aria-hidden="true"
          />
        </div>

        <p
          className="mt-5 text-[10px] text-[#8B6F4E] tracking-[0.32em] uppercase"
          style={fontBody}
        >
          uma carta da Momento Cake
        </p>

        <h3
          className="text-[26px] text-[#2d2319] mt-1 leading-tight"
          style={{ ...fontHeading, fontWeight: 600 }}
        >
          Pagamento confirmado!
        </h3>

        <p
          className="text-[13px] text-[#8b7e6e] mt-1.5"
          style={fontBody}
        >
          Pedido{' '}
          <span
            className="text-[#5c4a2e] tabular-nums"
            style={{ ...fontHeading, fontWeight: 600 }}
          >
            {pedido.numeroPedido}
          </span>
        </p>
      </div>

      {/* Hairline */}
      <div
        className="flex items-center justify-center gap-2 px-6 py-2"
        aria-hidden="true"
      >
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#d4c4a8]/60" />
        <div className="w-1 h-1 rounded-full bg-[#c9a96e]/70" />
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#d4c4a8]/60" />
      </div>

      {/* Handwritten thank-you body */}
      <div className="relative px-7 pb-7 pt-2 space-y-5">
        <p
          className="text-center text-[15px] text-[#5c4a2e] leading-relaxed"
          style={{ ...fontHeading, fontWeight: 500 }}
        >
          Obrigada,{' '}
          <span className="text-[#2d2319]">{pedido.clienteNome}</span>!
        </p>

        <div className="amount-glow rounded-2xl p-4 border border-[#d4c4a8]/30 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-white border border-[#d4c4a8]/50 flex items-center justify-center flex-shrink-0 shadow-sm">
            {isDelivery ? (
              <Truck className="h-4 w-4 text-[#b8956a]" />
            ) : (
              <Store className="h-4 w-4 text-[#b8956a]" />
            )}
          </div>
          <div className="flex-1 pt-0.5">
            <p
              className="text-[10px] text-[#a89b8a] tracking-[0.24em] uppercase"
              style={fontBody}
            >
              {isDelivery ? 'Entrega' : 'Retirada'}
            </p>
            <p
              className="text-[13px] text-[#5c4a2e] leading-relaxed mt-0.5"
              style={fontBody}
            >
              {nextStepsMessage}
            </p>
          </div>
        </div>

        {/* Sign-off */}
        <p
          className="text-center text-[11px] text-[#a89b8a] tracking-[0.22em] uppercase pt-1"
          style={fontBody}
        >
          feito com carinho
        </p>
      </div>
    </div>
  )
}
