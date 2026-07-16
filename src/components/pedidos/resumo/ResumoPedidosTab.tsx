'use client'

import { useMemo, useState } from 'react'
import { CalendarClock, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Pedido } from '@/types/pedido'
import {
  computeOrderFinance,
  formatBRL,
  formatEntregaResumo,
  formatResumoDayHeader,
  getActiveItens,
  getResumoTags,
  groupPedidosByDeliveryDay,
  RESUMO_TAG_LABELS,
  SEM_DATA_KEY,
  type DayGroup,
} from '@/lib/pedido-resumo'

function OrderBlock({ pedido, showPrices }: { pedido: Pedido; showPrices: boolean }) {
  const tags = getResumoTags(pedido)
  const entrega = formatEntregaResumo(pedido)
  const itens = getActiveItens(pedido)
  const finance = computeOrderFinance(pedido)
  const aguardandoOrcamento = tags.includes('ORCAMENTO_A_FAZER')

  return (
    <div className="border-b py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{pedido.clienteNome}</span>
        {tags.map((t) => (
          <Badge
            key={t}
            variant={t === 'CANCELADO' ? 'destructive' : 'secondary'}
            className="text-[10px] uppercase tracking-wide"
          >
            {RESUMO_TAG_LABELS[t]}
          </Badge>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{pedido.numeroPedido}</span>
      </div>

      {entrega.detail && (
        <p className="mt-0.5 text-sm text-muted-foreground">
          {entrega.label}: {entrega.detail}
        </p>
      )}
      {pedido.observacoes && (
        <p className="mt-0.5 text-sm text-muted-foreground">{pedido.observacoes}</p>
      )}

      {aguardandoOrcamento ? (
        <p className="mt-1 text-sm italic text-amber-600">
          Pedido aguardando definição de orçamento
        </p>
      ) : (
        <ul className="mt-1 space-y-0.5 text-sm">
          {itens.map((it) => (
            <li key={it.id} className="flex gap-1">
              <span className="text-muted-foreground/60">•</span>
              <span>
                {it.nome}
                {it.descricao ? `: ${it.descricao}` : ''}
                {showPrices && (
                  <span className="text-muted-foreground"> — {formatBRL(it.total)}</span>
                )}
              </span>
            </li>
          ))}
          {showPrices && finance.frete > 0 && (
            <li className="flex gap-1 text-muted-foreground">
              <span className="text-muted-foreground/60">•</span>
              <span>Frete: {formatBRL(finance.frete)}</span>
            </li>
          )}
        </ul>
      )}

      {!!pedido.imagensReferencia?.length && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Referências:</span>
          {pedido.imagensReferencia.map((img, i) => (
            <img
              key={img.id}
              src={img.url}
              alt={img.legenda || `Referência ${i + 1}`}
              loading="lazy"
              className="h-16 w-16 rounded border object-cover"
            />
          ))}
        </div>
      )}

      {showPrices && !aguardandoOrcamento && finance.total > 0 && (
        <p className="mt-1 text-sm font-medium">
          Total: {formatBRL(finance.total)}
          {' | '}Sinal: {formatBRL(finance.sinal)}
          {finance.sinalPago ? ' ✓' : ''}
          {' | '}Restante: {formatBRL(finance.restante)}
        </p>
      )}
    </div>
  )
}

function DayBlock({ group, showPrices }: { group: DayGroup; showPrices: boolean }) {
  const title =
    group.dayKey === SEM_DATA_KEY || !group.date
      ? 'Data a definir'
      : formatResumoDayHeader(group.date)
  return (
    <section className="rounded-md border">
      <header className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-primary">{title}</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {group.pedidos.length} pedido{group.pedidos.length === 1 ? '' : 's'}
        </span>
      </header>
      <div className="px-3">
        {group.pedidos.map((p) => (
          <OrderBlock key={p.id} pedido={p} showPrices={showPrices} />
        ))}
      </div>
    </section>
  )
}

/**
 * Orders tab — orders grouped by delivery day (with a trailing "Data a definir"
 * group), each showing client + status tags, the delivery/pickup line, item
 * bullets, and (when prices are toggled on) per-item prices + the financial
 * total/sinal/restante line.
 */
export function ResumoPedidosTab({ pedidos }: { pedidos: Pedido[] }) {
  const [showPrices, setShowPrices] = useState(false)
  const groups = useMemo(() => groupPedidosByDeliveryDay(pedidos), [pedidos])

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <CalendarClock className="mb-2 h-8 w-8" />
        <p>Nenhum pedido para o período selecionado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPrices((v) => !v)}
          className={cn('gap-1')}
        >
          {showPrices ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showPrices ? 'Ocultar valores' : 'Mostrar valores'}
        </Button>
      </div>
      {groups.map((g) => (
        <DayBlock key={g.dayKey} group={g} showPrices={showPrices} />
      ))}
    </div>
  )
}
