/**
 * Thermal (ESC/POS) renderer for the order receipt. Consumes the SAME
 * `ReciboModel` that drives the PDF (`buildReciboModel` in `pedido-recibo.ts`),
 * so the two outputs stay in sync — this module only lays the model out for an
 * 80mm roll and emits printer bytes via the `EscPos` builder.
 */
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatBRL } from '@/lib/pedido-resumo'
import { EscPos, LINE_WIDTH, padLR, wrapText } from '@/lib/escpos'
import type { ReciboModel } from '@/lib/pedido-recibo'

function formatDate(d: Date | null): string {
  return d ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : '-'
}

/** BRL without the non-breaking spaces some ICU builds insert (they'd print as '?'). */
function money(v: number): string {
  return formatBRL(v).replace(/[  ]/g, ' ')
}

/**
 * Build the full 80mm thermal receipt as ESC/POS bytes. `logo` (an ImageData
 * from the browser) is optional — when null the header simply omits the mark.
 */
export function buildThermalReceipt(model: ReciboModel, logo?: ImageData | null): Uint8Array {
  const p = new EscPos()
  p.init().codepage()

  // --- Letterhead (centered) ---
  p.align('center')
  if (logo) p.image(logo).newline()
  p.bold(true).line(model.company.tradeName).bold(false)
  p.line(model.company.legalName)
  p.line(`CNPJ: ${model.company.cnpj}`)
  for (const l of wrapText(`${model.company.address} - CEP: ${model.company.cep}`)) p.line(l)
  p.line(model.company.phone)
  p.line(model.company.email)

  // --- Order reference ---
  p.align('left').rule()
  p.bold(true).line(padLR(`VENDA ${model.numeroPedido}`, formatDate(model.emissao))).bold(false)

  // --- Client block ---
  p.rule()
  p.bold(true).line(model.client.nome).bold(false)
  if (model.client.documento) p.line(`CPF/CNPJ: ${model.client.documento}`)
  if (model.client.telefone) p.line(`Tel: ${model.client.telefone}`)
  if (model.client.email) p.line(model.client.email)
  if (model.client.endereco) for (const l of wrapText(model.client.endereco)) p.line(l)
  if (model.entregaDetalhe) {
    for (const l of wrapText(`${model.entregaLabel}: ${model.entregaDetalhe}`)) p.line(l)
  }
  if (model.dataEntrega) p.line(`Data de entrega: ${formatDate(model.dataEntrega)}`)

  // --- Items ---
  p.rule()
  p.bold(true).line(padLR('ITEM', 'SUBTOTAL')).bold(false)
  for (const item of model.itens) {
    for (const l of wrapText(item.nome)) p.line(l)
    if (item.descricao) for (const l of wrapText(item.descricao, LINE_WIDTH - 2)) p.line(`  ${l}`)
    p.line(padLR(`  ${item.quantidade} x ${money(item.precoUnitario)}`, money(item.total)))
  }

  // --- Totals ---
  p.rule()
  const t = model.totals
  p.line(padLR('Subtotal', money(t.subtotal)))
  if (t.descontoValor > 0) p.line(padLR('Descontos', `-${money(t.descontoValor)}`))
  if (t.acrescimo > 0) p.line(padLR('Acrescimo', money(t.acrescimo)))
  if (t.frete > 0) p.line(padLR('Frete', money(t.frete)))
  p.bold(true).line(padLR('VALOR LIQUIDO', money(t.valorLiquido))).bold(false)

  // --- Payments ---
  p.rule()
  p.bold(true).line('CONDICAO DE PAGAMENTO').bold(false)
  if (model.pagamentos.length > 0) {
    for (const pay of model.pagamentos) {
      p.line(padLR(`${formatDate(pay.data)} ${pay.metodo}`, money(pay.valor)))
      if (pay.observacao) for (const l of wrapText(pay.observacao, LINE_WIDTH - 2)) p.line(`  ${l}`)
    }
  } else {
    p.line('Nenhum pagamento registrado.')
  }
  p.line(padLR('Total pago', money(model.totalPago)))
  const saldoLabel = model.dataVencimento
    ? `Saldo (vence ${formatDate(model.dataVencimento)})`
    : 'Saldo restante'
  p.bold(true).line(padLR(saldoLabel, money(model.restante))).bold(false)

  // --- Observações ---
  if (model.observacoes) {
    p.rule()
    p.bold(true).line('OBSERVACOES').bold(false)
    for (const l of wrapText(model.observacoes)) p.line(l)
  }

  // --- Footer ---
  p.align('center').rule()
  p.line('Obrigado pela preferencia!')
  p.feed(4).cut()

  return p.encode()
}

// ---------------------------------------------------------------------------
// Logo loading (browser only)
// ---------------------------------------------------------------------------

/**
 * Load an image from a public path and return it as `ImageData` sized for the
 * printer (width rounded down to a multiple of 8, aspect preserved, drawn on a
 * white background so transparency prints blank). Returns null on any failure.
 */
export async function loadLogoImageData(
  path: string,
  dotWidth = 384,
): Promise<ImageData | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('logo load failed'))
      image.src = path
    })
    const targetW = Math.max(8, Math.floor(dotWidth / 8) * 8)
    const scale = targetW / (img.naturalWidth || targetW)
    const targetH = Math.max(1, Math.round((img.naturalHeight || 1) * scale))
    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, targetW, targetH)
    ctx.drawImage(img, 0, 0, targetW, targetH)
    return ctx.getImageData(0, 0, targetW, targetH)
  } catch {
    return null
  }
}

export { LINE_WIDTH }
