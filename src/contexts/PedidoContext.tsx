'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { Pedido } from '@/types/pedido'
import { fetchPedidoById } from '@/lib/pedidos'

interface PedidoContextValue {
  pedido: Pedido | null
  isLoading: boolean
  error: string | null
  refreshPedido: () => Promise<void>
  optimisticUpdate: (updater: (pedido: Pedido) => Pedido) => void
  rollback: () => void
}

const PedidoContext = createContext<PedidoContextValue | null>(null)

interface PedidoProviderProps {
  pedidoId: string
  children: ReactNode
}

export function PedidoProvider({ pedidoId, children }: PedidoProviderProps) {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const previousPedidoRef = useRef<Pedido | null>(null)

  const loadPedido = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await fetchPedidoById(pedidoId)
      setPedido(result)
      previousPedidoRef.current = result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedido')
    } finally {
      setIsLoading(false)
    }
  }, [pedidoId])

  const refreshPedido = useCallback(async () => {
    try {
      const result = await fetchPedidoById(pedidoId)
      setPedido(result)
      previousPedidoRef.current = result
    } catch (err) {
      console.error('Erro ao atualizar pedido:', err)
    }
  }, [pedidoId])

  const optimisticUpdate = useCallback((updater: (pedido: Pedido) => Pedido) => {
    setPedido((current) => {
      if (!current) return current
      previousPedidoRef.current = current
      return updater(current)
    })
  }, [])

  const rollback = useCallback(() => {
    if (previousPedidoRef.current) {
      setPedido(previousPedidoRef.current)
    }
  }, [])

  useEffect(() => {
    loadPedido()
  }, [loadPedido])

  return (
    <PedidoContext.Provider value={{ pedido, isLoading, error, refreshPedido, optimisticUpdate, rollback }}>
      {children}
    </PedidoContext.Provider>
  )
}

export function usePedido(): PedidoContextValue {
  const context = useContext(PedidoContext)
  if (!context) {
    throw new Error('usePedido must be used within a PedidoProvider')
  }
  return context
}

export function usePedidoOptional(): PedidoContextValue | null {
  return useContext(PedidoContext)
}
