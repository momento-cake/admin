'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Image as ImageIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReferenciaImagesEditor } from './ReferenciaImagesEditor'
import { usePermissions } from '@/hooks/usePermissions'
import { usePedidoOptional } from '@/contexts/PedidoContext'
import { parseApiResponse, describeError } from '@/lib/error-handler'
import type {
  Pedido,
  PedidoImagemReferencia,
  PedidoImagemReferenciaInput,
} from '@/types/pedido'

interface ReferenciasSectionProps {
  pedido: Pedido
  onUpdate: () => void
}

function toInput(imgs?: PedidoImagemReferencia[]): PedidoImagemReferenciaInput[] {
  return (imgs ?? []).map((i) => ({
    id: i.id,
    url: i.url,
    storagePath: i.storagePath,
    legenda: i.legenda,
    width: i.width,
    height: i.height,
  }))
}

export function ReferenciasSection({ pedido, onUpdate }: ReferenciasSectionProps) {
  const { canPerformAction } = usePermissions()
  const canEdit = canPerformAction('orders', 'update')
  const pedidoCtx = usePedidoOptional()

  const [items, setItems] = useState<PedidoImagemReferenciaInput[]>(
    toInput(pedido.imagensReferencia)
  )

  // Re-sync from the server on structural changes only (ids/urls) so an
  // in-progress caption edit isn't clobbered by an unrelated re-render.
  const serverSig = (pedido.imagensReferencia ?? [])
    .map((i) => `${i.id}:${i.url}`)
    .join('|')
  useEffect(() => {
    setItems(toInput(pedido.imagensReferencia))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSig, pedido.id])

  const persist = async (next: PedidoImagemReferenciaInput[]) => {
    try {
      const response = await fetch(`/api/pedidos/${pedido.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagensReferencia: next }),
      })
      await parseApiResponse(response)
      toast.success('Imagens de referência atualizadas')
      if (pedidoCtx) {
        await pedidoCtx.refreshPedido()
      } else {
        onUpdate()
      }
    } catch (error) {
      toast.error('Erro ao salvar imagens', { description: describeError(error) })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Imagens de Referência
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ReferenciaImagesEditor
          value={items}
          onChange={setItems}
          onCommit={canEdit ? persist : undefined}
          disabled={!canEdit}
        />
      </CardContent>
    </Card>
  )
}
