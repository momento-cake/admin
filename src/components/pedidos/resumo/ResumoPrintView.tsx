import type { CSSProperties } from 'react'
import type { Pedido } from '@/types/pedido'
import {
  aggregateItems,
  computeOrderFinance,
  formatBRL,
  formatEntregaResumo,
  formatResumoDayHeader,
  getActiveItens,
  getResumoTags,
  groupPedidosByDeliveryDay,
  RESUMO_TAG_LABELS,
  SEM_DATA_KEY,
} from '@/lib/pedido-resumo'

// Inline styles keep the print output faithful regardless of the app theme /
// print-CSS support (Tailwind theme tokens don't always survive print).
const C = {
  ink: '#2b2b2b',
  muted: '#6b7280',
  day: '#2f6f9f',
  section: '#c0531f',
  tag: '#c0531f',
  rule: '#e2e2e2',
}

const dayHeaderStyle: CSSProperties = {
  color: C.day,
  fontSize: 15,
  fontWeight: 600,
  margin: '18px 0 6px',
}
const clientStyle: CSSProperties = { color: C.ink, fontSize: 13, fontWeight: 600 }
const tagStyle: CSSProperties = { color: C.tag, fontWeight: 600, fontSize: 12 }
const metaStyle: CSSProperties = { color: C.muted, fontSize: 12, margin: '1px 0' }
const bulletStyle: CSSProperties = { color: C.ink, fontSize: 12, margin: '1px 0 1px 14px' }
const totalsStyle: CSSProperties = { color: C.muted, fontSize: 12, margin: '2px 0 0 0' }
const sectionStyle: CSSProperties = {
  color: C.section,
  fontSize: 16,
  fontWeight: 600,
  margin: '8px 0 8px',
}
const orderWrap: CSSProperties = {
  padding: '6px 0',
  borderBottom: `1px solid ${C.rule}`,
}

function Tags({ pedido }: { pedido: Pedido }) {
  const tags = getResumoTags(pedido)
  if (tags.length === 0) return null
  return (
    <>
      {' '}
      <span style={tagStyle}>
        ({tags.map((t) => RESUMO_TAG_LABELS[t].toUpperCase()).join(' · ')})
      </span>
    </>
  )
}

function OrderPrint({ pedido, comValores }: { pedido: Pedido; comValores: boolean }) {
  const entrega = formatEntregaResumo(pedido)
  const itens = getActiveItens(pedido)
  const finance = computeOrderFinance(pedido)
  const aguardando = getResumoTags(pedido).includes('ORCAMENTO_A_FAZER')

  return (
    <div style={orderWrap}>
      <div style={clientStyle}>
        {pedido.clienteNome}
        <Tags pedido={pedido} />
      </div>
      {entrega.detail && (
        <div style={metaStyle}>
          {entrega.label}: {entrega.detail}
        </div>
      )}
      {pedido.observacoes && <div style={metaStyle}>{pedido.observacoes}</div>}

      {aguardando ? (
        <div style={{ ...metaStyle, color: C.section }}>
          Pedido aguardando definição de orçamento
        </div>
      ) : (
        <>
          {itens.map((it) => (
            <div key={it.id} style={bulletStyle}>
              • {it.nome}
              {it.descricao ? `: ${it.descricao}` : ''}
              {comValores ? ` — ${formatBRL(it.total)}` : ''}
            </div>
          ))}
          {comValores && finance.frete > 0 && (
            <div style={bulletStyle}>• Frete: {formatBRL(finance.frete)}</div>
          )}
          {comValores && finance.total > 0 && (
            <div style={totalsStyle}>
              Total: {formatBRL(finance.total)} | Sinal: {formatBRL(finance.sinal)}
              {finance.sinalPago ? ' ✓' : ''} | Restante: {formatBRL(finance.restante)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface ResumoPrintViewProps {
  pedidos: Pedido[]
  rangeLabel: string
  comValores: boolean
}

/**
 * Print-optimised layout matching the provided reference sheets. Pure
 * presentational — the print route fetches the data and triggers window.print.
 *  - comValores=false → orders (no prices) + aggregated items summary.
 *  - comValores=true  → orders with per-item prices + financial totals; no
 *    items summary (mirrors the reference COM_VALORES sheet).
 */
export function ResumoPrintView({ pedidos, rangeLabel, comValores }: ResumoPrintViewProps) {
  const groups = groupPedidosByDeliveryDay(pedidos)
  const items = comValores ? [] : aggregateItems(pedidos)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 28px', color: C.ink }}>
      <h1 style={{ textAlign: 'center', fontSize: 22, fontWeight: 600, margin: 0 }}>
        Pedidos da Semana — Momento Cake{comValores ? '' : ' (Produção)'}
      </h1>
      <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, marginTop: 4 }}>
        {rangeLabel}
      </p>

      {groups.map((g) => (
        <section key={g.dayKey} className="resumo-day">
          <h2 style={dayHeaderStyle}>
            {g.dayKey === SEM_DATA_KEY || !g.date ? 'Data a definir' : formatResumoDayHeader(g.date)}
          </h2>
          {g.pedidos.map((p) => (
            <OrderPrint key={p.id} pedido={p} comValores={comValores} />
          ))}
        </section>
      ))}

      {!comValores && items.length > 0 && (
        <section className="resumo-itens" style={{ breakBefore: 'page', pageBreakBefore: 'always' }}>
          <h2 style={sectionStyle}>RESUMO DE ITENS — INDEPENDENTE DE CLIENTE</h2>
          {items.map((item) => (
            <div key={item.nome} style={{ margin: '4px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {item.nome} — {item.totalQuantidade} un.
              </div>
              <div style={{ ...metaStyle, marginLeft: 14 }}>
                {item.contribs
                  .map(
                    (c) =>
                      `${c.clienteNome}${c.dataEntrega ? ` (${formatResumoDayHeader(c.dataEntrega).slice(0, 5)})` : ''}: ${c.quantidade}`
                  )
                  .join(' | ')}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
