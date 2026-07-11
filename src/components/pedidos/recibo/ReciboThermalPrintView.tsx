import type { CSSProperties } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatBRL } from '@/lib/pedido-resumo'
import type { ReciboModel } from '@/lib/pedido-recibo'

// Inline styles keep the print output faithful regardless of app theme / print
// CSS support (same rationale as ResumoPrintView). Sized for an 80mm roll.
const C = { ink: '#000', muted: '#333', rule: '#000' }

// 72mm roll: keep the content a touch narrower than the paper so nothing clips
// at the edges (thermal heads have a small unprintable margin).
const wrap: CSSProperties = {
  width: '68mm',
  margin: '0 auto',
  padding: '2mm 0 4mm',
  color: C.ink,
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
  fontSize: 11,
  lineHeight: 1.35,
}
const center: CSSProperties = { textAlign: 'center' }
const muted: CSSProperties = { color: C.muted }
const divider: CSSProperties = { borderTop: `1px dashed ${C.rule}`, margin: '6px 0' }
const row: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 8 }
const bold: CSSProperties = { fontWeight: 700 }

function fmtDate(d: Date | null): string {
  return d ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : '-'
}

function Row({ left, right, strong }: { left: string; right: string; strong?: boolean }) {
  return (
    <div style={{ ...row, ...(strong ? bold : undefined) }}>
      <span>{left}</span>
      <span style={{ whiteSpace: 'nowrap' }}>{right}</span>
    </div>
  )
}

/**
 * 80mm single-column receipt used as the browser-print fallback when the USB
 * thermal printer isn't reachable. Driven by the same `ReciboModel` as the
 * ESC/POS renderer, so both outputs stay in sync.
 */
export function ReciboThermalPrintView({ model }: { model: ReciboModel }) {
  const c = model.company
  const t = model.totals

  return (
    <div style={wrap}>
      {/* Force an 80mm page with no margins. */}
      <style>{`@page { size: 72mm auto; margin: 0; } @media print { html, body { margin: 0; } }`}</style>

      {/* Letterhead */}
      <div style={center}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.logoPath} alt={c.tradeName} style={{ width: '40mm', height: 'auto', margin: '0 auto 4px' }} />
        <div style={bold}>{c.tradeName}</div>
        <div style={muted}>{c.legalName}</div>
        <div style={muted}>CNPJ: {c.cnpj}</div>
        <div style={muted}>{c.address} - CEP: {c.cep}</div>
        <div style={muted}>{c.phone}</div>
        <div style={muted}>{c.email}</div>
      </div>

      <div style={divider} />
      <Row left={`VENDA ${model.numeroPedido}`} right={fmtDate(model.emissao)} strong />

      {/* Client */}
      <div style={divider} />
      <div style={bold}>{model.client.nome}</div>
      {model.client.documento && <div style={muted}>CPF/CNPJ: {model.client.documento}</div>}
      {model.client.telefone && <div style={muted}>Tel: {model.client.telefone}</div>}
      {model.client.email && <div style={muted}>{model.client.email}</div>}
      {model.client.endereco && <div style={muted}>{model.client.endereco}</div>}
      {model.entregaDetalhe && (
        <div style={muted}>{model.entregaLabel}: {model.entregaDetalhe}</div>
      )}
      {model.dataEntrega && <div style={muted}>Entrega: {fmtDate(model.dataEntrega)}</div>}

      {/* Items */}
      <div style={divider} />
      {model.itens.map((item, i) => (
        <div key={i} style={{ marginBottom: 3 }}>
          <div>{item.nome}</div>
          {item.descricao && <div style={{ ...muted, fontSize: 10 }}>{item.descricao}</div>}
          <Row left={`${item.quantidade} x ${formatBRL(item.precoUnitario)}`} right={formatBRL(item.total)} />
        </div>
      ))}

      {/* Totals */}
      <div style={divider} />
      <Row left="Subtotal" right={formatBRL(t.subtotal)} />
      {t.descontoValor > 0 && <Row left="Descontos" right={`-${formatBRL(t.descontoValor)}`} />}
      {t.acrescimo > 0 && <Row left="Acréscimo" right={formatBRL(t.acrescimo)} />}
      {t.frete > 0 && <Row left="Frete" right={formatBRL(t.frete)} />}
      <Row left="Valor líquido" right={formatBRL(t.valorLiquido)} strong />

      {/* Payments */}
      <div style={divider} />
      <div style={bold}>CONDIÇÃO DE PAGAMENTO</div>
      {model.pagamentos.length > 0 ? (
        model.pagamentos.map((pay, i) => (
          <div key={i}>
            <Row left={`${fmtDate(pay.data)} ${pay.metodo}`} right={formatBRL(pay.valor)} />
            {pay.observacao && <div style={{ ...muted, fontSize: 10 }}>{pay.observacao}</div>}
          </div>
        ))
      ) : (
        <div style={muted}>Nenhum pagamento registrado.</div>
      )}
      <Row left="Total pago" right={formatBRL(model.totalPago)} />
      <Row
        left={model.dataVencimento ? `Saldo (vence ${fmtDate(model.dataVencimento)})` : 'Saldo restante'}
        right={formatBRL(model.restante)}
        strong
      />

      {/* Observações */}
      {model.observacoes && (
        <>
          <div style={divider} />
          <div style={bold}>OBSERVAÇÕES</div>
          <div style={muted}>{model.observacoes}</div>
        </>
      )}

      <div style={divider} />
      <div style={center}>Obrigado pela preferência!</div>
    </div>
  )
}
