'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Truck, Store, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { PedidoEntrega, EntregaTipo, ENTREGA_TIPO_LABELS } from '@/types/pedido'
import { StoreAddress } from '@/types/store-settings'
import { Address } from '@/types/client'
import { AddressSelector } from './AddressSelector'
import { FreteCalculator } from './FreteCalculator'
import { usePedidoOptional } from '@/contexts/PedidoContext'
import { parseApiResponse, logError } from '@/lib/error-handler'

interface EntregaSectionProps {
  pedidoId: string
  entrega: PedidoEntrega
  clientAddresses?: Address[]
  /**
   * Persists the new entrega. May return a Promise that rejects on failure;
   * EntregaSection awaits it so it can rollback its optimistic update.
   */
  onUpdate: (entrega: PedidoEntrega) => void | Promise<void>
}

export function EntregaSection({
  pedidoId,
  entrega,
  clientAddresses = [],
  onUpdate,
}: EntregaSectionProps) {
  const pedidoCtx = usePedidoOptional()
  const [storeAddresses, setStoreAddresses] = useState<StoreAddress[]>([])
  const [loadingStoreAddresses, setLoadingStoreAddresses] = useState(false)
  const [storeAddressLoadError, setStoreAddressLoadError] = useState<string | null>(null)

  useEffect(() => {
    loadStoreAddresses()
  }, [])

  const loadStoreAddresses = async () => {
    setLoadingStoreAddresses(true)
    setStoreAddressLoadError(null)
    try {
      const response = await fetch('/api/store-addresses')
      const data = await parseApiResponse<StoreAddress[]>(response)
      setStoreAddresses(data || [])
    } catch (err) {
      logError('EntregaSection.loadAddresses', err)
      setStoreAddressLoadError(
        'Não foi possível carregar endereços. Tente novamente mais tarde.'
      )
      setStoreAddresses([])
    } finally {
      setLoadingStoreAddresses(false)
    }
  }

  const applyEntregaUpdate = async (newEntrega: PedidoEntrega) => {
    // Apply optimistic update if context is available; the handle lets us
    // rollback when the parent's persist call (PedidoDetailView.handleEntregaUpdate)
    // throws. The parent now re-throws on failure, so awaiting onUpdate is the
    // signal we need.
    const handle = pedidoCtx?.optimisticUpdate((p) => ({ ...p, entrega: newEntrega }))
    try {
      await onUpdate(newEntrega)
      handle?.commit()
    } catch {
      // Parent already surfaced the toast / logged. We just revert the UI.
      handle?.rollback()
    }
  }

  const handleTipoChange = (tipo: EntregaTipo) => {
    applyEntregaUpdate({
      ...entrega,
      tipo,
      // Reset fields when switching type
      ...(tipo === 'RETIRADA'
        ? {
            enderecoEntrega: undefined,
            enderecoEntregaClienteId: undefined,
            distanciaKm: undefined,
            freteTotal: 0,
          }
        : {
            enderecoRetiradaId: undefined,
            enderecoRetiradaNome: undefined,
          }),
    })
  }

  const handleDeliveryAddressSelect = (address: Address) => {
    applyEntregaUpdate({
      ...entrega,
      enderecoEntrega: address,
      enderecoEntregaClienteId: address.id,
    })
  }

  const handlePickupAddressSelect = (storeAddr: StoreAddress) => {
    applyEntregaUpdate({
      ...entrega,
      enderecoRetiradaId: storeAddr.id,
      enderecoRetiradaNome: storeAddr.nome,
    })
  }

  const handleFreteUpdate = (updates: Partial<PedidoEntrega>) => {
    applyEntregaUpdate({
      ...entrega,
      ...updates,
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Entrega / Retirada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Delivery type toggle */}
        <div className="flex gap-2">
          {(['ENTREGA', 'RETIRADA'] as EntregaTipo[]).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => handleTipoChange(tipo)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                entrega.tipo === tipo
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40'
              }`}
            >
              {tipo === 'ENTREGA' ? (
                <Truck className="h-4 w-4" />
              ) : (
                <Store className="h-4 w-4" />
              )}
              <span className="font-medium text-sm">{ENTREGA_TIPO_LABELS[tipo]}</span>
            </button>
          ))}
        </div>

        {/* Delivery mode: address selector + freight */}
        {entrega.tipo === 'ENTREGA' && (
          <div className="space-y-4">
            <AddressSelector
              clientAddresses={clientAddresses}
              selectedAddress={entrega.enderecoEntrega || null}
              onSelect={handleDeliveryAddressSelect}
              label="Endereço de Entrega"
            />

            {entrega.enderecoEntrega && (
              <FreteCalculator
                pedidoId={pedidoId}
                entrega={entrega}
                onUpdate={handleFreteUpdate}
              />
            )}
          </div>
        )}

        {/* Pickup mode: store address selector */}
        {entrega.tipo === 'RETIRADA' && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Local de Retirada
            </label>
            {loadingStoreAddresses ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="border rounded-lg p-3 flex items-center gap-2">
                    <Skeleton className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                  </div>
                ))}
              </div>
            ) : storeAddressLoadError ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden />
                <span>{storeAddressLoadError}</span>
              </div>
            ) : storeAddresses.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Nenhum endereço de loja cadastrado. Cadastre em{' '}
                <Link href="/settings/store-addresses" className="text-primary hover:underline">
                  Configurações
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-2">
                {storeAddresses.map((addr) => (
                  <Card
                    key={addr.id}
                    className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                      entrega.enderecoRetiradaId === addr.id
                        ? 'ring-2 ring-primary bg-primary/5'
                        : ''
                    }`}
                    onClick={() => handlePickupAddressSelect(addr)}
                  >
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{addr.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {[addr.endereco, addr.numero, addr.bairro, addr.cidade, addr.estado]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
