'use client'

import { Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PedidoItemsTable } from '@/components/pedidos/PedidoItemsTable'
import { PedidoItem } from '@/types/pedido'
import { formatPrice } from '@/lib/products'

interface ItensStepProps {
  items: PedidoItem[]
  onChange: (items: PedidoItem[]) => void
}

export function ItensStep({ items, onChange }: ItensStepProps) {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            Itens do Pedido
            {items.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {items.length} {items.length === 1 ? 'item' : 'itens'}
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            Adicione produtos ou itens personalizados ao pedido
          </p>
        </div>

        {items.length > 0 && (
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <p className="text-xl font-bold text-primary">
              {formatPrice(subtotal)}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-muted-foreground">
        <Package className="h-4 w-4" />
        <span className="text-sm">Produtos e itens personalizados</span>
      </div>

      <PedidoItemsTable items={items} onChange={onChange} />
    </div>
  )
}
