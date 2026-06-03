'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Package } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Pedido } from '@/types/pedido'
import { aggregateItems, type AggregatedItem } from '@/lib/pedido-resumo'

function contribLabel(c: AggregatedItem['contribs'][number]): string {
  const date = c.dataEntrega ? ` (${format(c.dataEntrega, 'dd/MM')})` : ''
  return `${c.clienteNome}${date}: ${c.quantidade}`
}

function ItemRow({ item }: { item: AggregatedItem }) {
  const [open, setOpen] = useState(false)
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <li className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 py-2 text-left hover:bg-muted/40"
      >
        <Chevron className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="font-medium">{item.nome}</span>
        <span className="ml-auto whitespace-nowrap font-semibold tabular-nums">
          {item.totalQuantidade} un.
        </span>
      </button>
      {open && (
        <ul className="ml-6 mb-2 space-y-1 text-sm text-muted-foreground">
          {item.contribs.map((c, i) => (
            <li key={`${c.pedidoId}-${i}`} className="flex items-center gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span>{contribLabel(c)}</span>
              <span className="text-xs text-muted-foreground/70">{c.numeroPedido}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/**
 * Items tab — every active-orcamento line item across the range collapsed by
 * name, summed, with an expandable per-order breakdown (the "hint" that shows
 * which orders contribute and how many).
 */
export function ResumoItensTab({ pedidos }: { pedidos: Pedido[] }) {
  const items = useMemo(() => aggregateItems(pedidos), [pedidos])

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Package className="mb-2 h-8 w-8" />
        <p>Nenhum item para o período selecionado.</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-md border')}>
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-sm font-medium">
        <span>Item</span>
        <span>Quantidade total</span>
      </div>
      <ul className="px-3">
        {items.map((item) => (
          <ItemRow key={item.nome} item={item} />
        ))}
      </ul>
    </div>
  )
}
