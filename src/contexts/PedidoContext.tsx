'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { Pedido } from '@/types/pedido'
import { parseApiResponse, formatErrorMessage, logError } from '@/lib/error-handler'

export interface OptimisticHandle {
  rollback: () => void
  commit: () => void
}

interface PedidoContextValue {
  pedido: Pedido | null
  isLoading: boolean
  error: string | null
  refreshPedido: () => Promise<void>
  /**
   * Apply an optimistic mutation. Each call returns its own `{ rollback, commit }`
   * handle, so concurrent operations don't trample each other's baselines.
   * Always call exactly one of `rollback()` (on failure) or `commit()` (on success).
   */
  optimisticUpdate: (updater: (pedido: Pedido) => Pedido) => OptimisticHandle
  /**
   * @deprecated Prefer the handle returned by `optimisticUpdate`. Kept for
   * legacy call sites; rolls back to the most recent stacked baseline.
   */
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
  // Stack of pending optimistic baselines. Top of stack is the most recent
  // pre-mutation snapshot. Cleared as operations commit or rollback.
  const baselineStackRef = useRef<Pedido[]>([])

  const loadPedido = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/pedidos/${pedidoId}`)
      const result = await parseApiResponse<Pedido>(response)
      setPedido(result)
      baselineStackRef.current = []
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [pedidoId])

  const refreshPedido = useCallback(async () => {
    try {
      const response = await fetch(`/api/pedidos/${pedidoId}`)
      const result = await parseApiResponse<Pedido>(response)
      setPedido(result)
      baselineStackRef.current = []
    } catch (err) {
      logError('PedidoContext.refreshPedido', err)
      throw err
    }
  }, [pedidoId])

  const optimisticUpdate = useCallback(
    (updater: (pedido: Pedido) => Pedido): OptimisticHandle => {
      let baseline: Pedido | null = null
      setPedido((current) => {
        if (!current) return current
        baseline = current
        baselineStackRef.current.push(current)
        return updater(current)
      })

      let settled = false
      return {
        rollback: () => {
          if (settled) return
          settled = true
          if (!baseline) return
          const stack = baselineStackRef.current
          const idx = stack.lastIndexOf(baseline)
          if (idx >= 0) stack.splice(idx, 1)
          setPedido(baseline)
        },
        commit: () => {
          if (settled) return
          settled = true
          if (!baseline) return
          const stack = baselineStackRef.current
          const idx = stack.lastIndexOf(baseline)
          if (idx >= 0) stack.splice(idx, 1)
        },
      }
    },
    []
  )

  // Legacy helper: roll back to the most recent unsettled baseline.
  const rollback = useCallback(() => {
    const stack = baselineStackRef.current
    const last = stack.pop()
    if (last) setPedido(last)
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
