'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calculator, RefreshCw, Loader2, MapPin, Truck } from 'lucide-react'
import { PedidoEntrega } from '@/types/pedido'
import { formatPrice } from '@/lib/products'
import {
  ApiError,
  describeError,
  parseApiResponse,
} from '@/lib/error-handler'

interface FreteCalculatorProps {
  pedidoId: string
  entrega: PedidoEntrega
  onUpdate: (entrega: Partial<PedidoEntrega>) => void
}

export function FreteCalculator({
  pedidoId,
  entrega,
  onUpdate,
}: FreteCalculatorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [manualDistance, setManualDistance] = useState('')

  const handleCalculate = async () => {
    if (!entrega.enderecoEntrega) {
      setError('Selecione um endereço de entrega primeiro')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/pedidos/${pedidoId}/calcular-frete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enderecoEntrega: entrega.enderecoEntrega,
        }),
        signal: AbortSignal.timeout(15000),
      })

      const data = await parseApiResponse<{
        distanciaKm: number
        custoPorKm: number
        freteTotal: number
      }>(response)

      onUpdate({
        distanciaKm: data.distanciaKm,
        custoPorKm: data.custoPorKm,
        freteTotal: data.freteTotal,
      })
    } catch (err) {
      // Manual-distance UX path: the calcular-frete API returns HTTP 422 with
      // `needsManualDistance: true` when geocoding/route calculation fails.
      // The flag sits at the top level of the response (not inside `details`),
      // so we trigger on `status === 422` — this endpoint only returns 422 in
      // that scenario.
      const isManualDistance =
        err instanceof ApiError && err.status === 422

      if (isManualDistance) {
        setManualMode(true)
        const message =
          err instanceof Error
            ? err.message
            : 'Cálculo automático falhou. Insira a distância manualmente.'
        setError(message)
        toast.error('Cálculo automático indisponível', {
          description: describeError(err),
        })
        return
      }

      // Timeout path (AbortSignal.timeout fires a TimeoutError DOMException).
      if (
        err instanceof DOMException &&
        (err.name === 'TimeoutError' || err.name === 'AbortError')
      ) {
        setError('Tempo limite excedido ao calcular frete')
        toast.error('Tempo limite excedido ao calcular frete', {
          description:
            'O serviço de cálculo demorou mais que o esperado. Tente novamente.',
        })
        return
      }

      const message =
        err instanceof Error ? err.message : 'Erro de conexão ao calcular frete'
      setError(message)
      toast.error('Erro ao calcular frete', {
        description: describeError(err),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleManualDistance = () => {
    const km = parseFloat(manualDistance)
    if (isNaN(km) || km <= 0) {
      setError('Distância deve ser maior que 0')
      return
    }

    const custoPorKm = entrega.custoPorKm || 4.5
    const taxaExtra = entrega.taxaExtra || 0
    const freteTotal = km * custoPorKm + taxaExtra

    onUpdate({
      distanciaKm: km,
      freteTotal: Math.round(freteTotal * 100) / 100,
    })
    setManualMode(false)
    setError('')
  }

  const handleTaxaExtraChange = (value: string) => {
    const taxa = parseFloat(value) || 0
    const distanciaKm = entrega.distanciaKm || 0
    const custoPorKm = entrega.custoPorKm || 4.5
    const freteTotal = distanciaKm * custoPorKm + taxa

    onUpdate({
      taxaExtra: taxa,
      freteTotal: Math.round(freteTotal * 100) / 100,
    })
  }

  const handleTaxaExtraNotaChange = (value: string) => {
    onUpdate({ taxaExtraNota: value })
  }

  const formatAddressShort = (addr: Record<string, unknown> | undefined) => {
    if (!addr) return '-'
    const parts = [addr.endereco, addr.numero, addr.bairro, addr.cidade, addr.estado]
      .filter(Boolean)
    return parts.join(', ') || '-'
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Cálculo de Frete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Route info */}
        {entrega.enderecoEntrega && (
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
              <div>
                <span className="text-muted-foreground">Origem: </span>
                <span>Loja</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-red-600 flex-shrink-0" />
              <div>
                <span className="text-muted-foreground">Destino: </span>
                <span>{formatAddressShort(entrega.enderecoEntrega as unknown as Record<string, unknown>)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Calculate / Recalculate button */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCalculate}
            disabled={loading || !entrega.enderecoEntrega}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : entrega.distanciaKm ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Calculator className="h-4 w-4" />
            )}
            {entrega.distanciaKm ? 'Recalcular' : 'Calcular Distância'}
          </Button>
          {!manualMode && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setManualMode(true)}
              className="text-xs"
            >
              Inserir manualmente
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Manual distance input */}
        {manualMode && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-1">
                Distância (km)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={manualDistance}
                onChange={(e) => setManualDistance(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: 15.5"
              />
            </div>
            <Button type="button" size="sm" onClick={handleManualDistance}>
              Aplicar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setManualMode(false)
                setError('')
              }}
            >
              Cancelar
            </Button>
          </div>
        )}

        {/* Freight breakdown */}
        {entrega.distanciaKm != null && entrega.distanciaKm > 0 && (
          <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distância</span>
              <span>{entrega.distanciaKm} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo por km</span>
              <span>{formatPrice(entrega.custoPorKm || 4.5)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Taxa extra</span>
              <div className="flex items-center gap-2">
                <span>R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={entrega.taxaExtra || 0}
                  onChange={(e) => handleTaxaExtraChange(e.target.value)}
                  className="w-24 px-2 py-1 border border-border rounded bg-background text-right text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            {(entrega.taxaExtra || 0) > 0 && (
              <div>
                <input
                  type="text"
                  value={entrega.taxaExtraNota || ''}
                  onChange={(e) => handleTaxaExtraNotaChange(e.target.value)}
                  className="w-full px-2 py-1 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Motivo da taxa extra..."
                />
              </div>
            )}
            <div className="border-t border-border pt-2 flex justify-between font-medium">
              <span>Total do Frete</span>
              <span>{formatPrice(entrega.freteTotal || 0)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
