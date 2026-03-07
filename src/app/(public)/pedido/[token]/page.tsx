'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { PublicPedidoView } from '@/components/public/PublicPedidoView'
import type { PublicPedidoData } from '@/components/public/PublicPedidoView'

const fontHeading = { fontFamily: 'var(--font-playfair), Georgia, serif' }
const fontBody = { fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }

export default function PublicPedidoPage() {
  const params = useParams()
  const token = params.token as string

  const [pedido, setPedido] = React.useState<PublicPedidoData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchPedido = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/public/pedidos/${token}`)
      const json = await response.json()

      if (!response.ok || !json.success) {
        if (response.status === 404) {
          setError('Pedido não encontrado')
        } else if (response.status === 403) {
          setError('Este pedido não está disponível para visualização')
        } else {
          setError(json.error || 'Erro ao carregar pedido')
        }
        return
      }

      setPedido(json.data)
    } catch (err) {
      console.error('Error loading public pedido:', err)
      setError('Erro ao carregar pedido')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  React.useEffect(() => {
    if (token) {
      fetchPedido()
    }
  }, [token, fetchPedido])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#faf7f2' }}>
        <div className="text-center">
          {/* Logo */}
          <div className="relative inline-block mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#b8956a] to-[#8b7355] flex items-center justify-center shadow-md mx-auto">
              <span className="text-white text-2xl" style={{ ...fontHeading, fontWeight: 600 }}>
                M
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#e8c87a] flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-[#5c4a2e]" />
            </div>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-[#b8956a] mx-auto mb-4" />
          <p className="text-[#8b7e6e] text-sm tracking-wide" style={fontBody}>
            Carregando seu pedido...
          </p>
        </div>
      </div>
    )
  }

  if (error || !pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#faf7f2' }}>
        <div className="text-center max-w-md px-6">
          {/* Logo */}
          <div className="relative inline-block mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#b8956a] to-[#8b7355] flex items-center justify-center shadow-md mx-auto">
              <span className="text-white text-2xl" style={{ ...fontHeading, fontWeight: 600 }}>
                M
              </span>
            </div>
          </div>
          <h1
            className="text-2xl text-[#2d2319] mb-3"
            style={{ ...fontHeading, fontWeight: 600 }}
          >
            {error || 'Pedido não encontrado'}
          </h1>
          <p className="text-sm text-[#8b7e6e] leading-relaxed" style={fontBody}>
            O pedido que você está procurando não existe ou não está mais disponível.
          </p>
          {/* Decorative divider */}
          <div className="flex items-center justify-center gap-3 mt-8" aria-hidden="true">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#d4c4a8]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#d4c4a8]" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#d4c4a8]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <PublicPedidoView
      pedido={pedido}
      token={token}
      onPedidoUpdate={setPedido}
    />
  )
}
