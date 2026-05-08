'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { PublicPedidoView } from '@/components/public/PublicPedidoView'
import type { PublicPedidoData } from '@/components/public/PublicPedidoView'
import { BrandLogo } from '@/components/public/brand/BrandLogo'
import { BrandHairline } from '@/components/public/brand/BrandHairline'
import {
  ApiError,
  formatErrorMessage,
  logError,
  parseApiResponse,
} from '@/lib/error-handler'

const fontHeading = { fontFamily: 'var(--font-cormorant), Georgia, serif' }
const fontBody = { fontFamily: 'var(--font-montserrat), system-ui, sans-serif' }

export default function PublicPedidoPage() {
  const params = useParams()
  const token = params.token as string

  const [pedido, setPedido] = React.useState<PublicPedidoData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchPedido = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/public/pedidos/${token}`)
      const data = await parseApiResponse<PublicPedidoData>(response)
      setPedido(data)
    } catch (err) {
      logError('PublicPedidoPage.fetch', err)
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError('Pedido não encontrado')
        } else if (err.status === 403) {
          setError('Este pedido não está disponível para visualização')
        } else {
          setError(err.message || 'Erro ao carregar pedido')
        }
      } else {
        setError(formatErrorMessage(err) || 'Erro ao carregar pedido')
      }
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#FBF8F4' }}
      >
        <div className="text-center px-6">
          {/* Real brand mark, in the live brand gold */}
          <div className="mb-8 flex justify-center">
            <BrandLogo
              variant="horizontal"
              width={220}
              ariaLabel="Momento Cake"
            />
          </div>
          <Loader2
            className="h-5 w-5 animate-spin text-[#C9A96E] mx-auto mb-4"
            aria-hidden="true"
          />
          <p
            className="text-[#6B5B4E] text-[12px] tracking-[0.22em] uppercase"
            style={fontBody}
          >
            Carregando seu pedido...
          </p>
        </div>
      </div>
    )
  }

  if (error || !pedido) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#FBF8F4' }}
      >
        <div className="text-center max-w-md px-6">
          <div className="mb-8 flex justify-center">
            <BrandLogo
              variant="horizontal"
              width={220}
              ariaLabel="Momento Cake"
            />
          </div>
          <h1
            className="text-2xl text-[#2C1810] mb-3"
            style={{ ...fontHeading, fontWeight: 600 }}
          >
            {error || 'Pedido não encontrado'}
          </h1>
          <p
            className="text-sm text-[#6B5B4E] leading-relaxed"
            style={fontBody}
          >
            O pedido que você está procurando não existe ou não está mais
            disponível.
          </p>
          <BrandHairline variant="wide" className="mt-8" />
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
