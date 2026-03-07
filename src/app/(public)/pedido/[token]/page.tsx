'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { PublicPedidoView } from '@/components/public/PublicPedidoView'
import type { PublicPedidoData } from '@/components/public/PublicPedidoView'

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500 mx-auto mb-4" />
          <p className="text-gray-500">Carregando pedido...</p>
        </div>
      </div>
    )
  }

  if (error || !pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-white">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">&#x1f382;</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">
            {error || 'Pedido não encontrado'}
          </h1>
          <p className="text-gray-500">
            O pedido que você está procurando não existe ou não está mais disponível.
          </p>
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
