/**
 * Order receipt (recibo/venda) model + PDF generation.
 *
 * Two concerns, deliberately separated so the model builder can be unit-tested
 * without jsPDF or a DOM:
 *   - `buildReciboModel(pedido, client)` — pure, framework-free view-model.
 *   - `generateReciboPDF(model, logoDataUrl)` — draws the A4 document with jsPDF.
 *   - `loadLogoDataUrl(path)` — browser helper to embed the logo crisply.
 *
 * Mirrors the client-side jsPDF pattern established by `generateEspelhoPDF`
 * in `time-tracking-export.ts`.
 */
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Client } from '@/types/client'
import type { Address } from '@/types/client'
import type { Pedido } from '@/types/pedido'
import { PAGAMENTO_METODO_LABELS } from '@/types/pedido'
import { formatCpfCnpj, formatPhone } from '@/lib/masks'
import {
  formatBRL,
  formatEntregaResumo,
  getActiveItens,
  getActiveOrcamento,
  toDateOrNull,
} from '@/lib/pedido-resumo'
import { COMPANY_INFO, type CompanyInfo } from '@/lib/company-info'

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export interface ReciboClient {
  nome: string
  /** Formatted CPF/CNPJ, when available. */
  documento?: string
  email?: string
  telefone?: string
  /** One-line formatted address, when available. */
  endereco?: string
}

export interface ReciboItem {
  quantidade: number
  nome: string
  descricao?: string
  precoUnitario: number
  total: number
}

export interface ReciboPayment {
  data: Date | null
  /** pt-BR method label (e.g. "PIX", "Dinheiro"). */
  metodo: string
  valor: number
  observacao?: string
}

export interface ReciboTotals {
  /** Sum of item subtotals, before discount/surcharge. */
  subtotal: number
  /** Discount as an absolute value (resolved from valor/percentual). */
  descontoValor: number
  /** Surcharge. */
  acrescimo: number
  /** Shipping (frete). */
  frete: number
  /** Final billable amount: max(0, subtotal - desconto + acrescimo) + frete. */
  valorLiquido: number
}

export interface ReciboModel {
  company: CompanyInfo
  numeroPedido: string
  /** Issue date (order creation). */
  emissao: Date | null
  entregaLabel: string
  entregaDetalhe: string
  dataEntrega: Date | null
  client: ReciboClient
  itens: ReciboItem[]
  totals: ReciboTotals
  pagamentos: ReciboPayment[]
  totalPago: number
  restante: number
  dataVencimento: Date | null
  observacoes?: string
}

// ---------------------------------------------------------------------------
// Model builder (pure)
// ---------------------------------------------------------------------------

/** Join the parts of a client address into a single readable line. */
export function formatClientAddress(addr: Address | undefined): string | undefined {
  if (!addr) return undefined
  const line1 = [addr.endereco, addr.numero].filter(nonEmpty).join(', ')
  const withComplement = [line1, addr.complemento].filter(nonEmpty).join(' - ')
  const cityState = [addr.cidade, addr.estado].filter(nonEmpty).join(' - ')
  const parts = [withComplement, addr.bairro, cityState].filter(nonEmpty)
  const base = parts.join(' - ')
  const cep = nonEmpty(addr.cep) ? `CEP: ${addr.cep}` : ''
  const full = [base, cep].filter(nonEmpty).join(' - ')
  return full.length > 0 ? full : undefined
}

function nonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

/** Resolve the client's document, preferring cpfCnpj, then a business CNPJ. */
function resolveDocumento(client: Client | null): string | undefined {
  if (!client) return undefined
  if (nonEmpty(client.cpfCnpj)) return formatCpfCnpj(client.cpfCnpj)
  if (client.type === 'business' && nonEmpty(client.companyInfo?.cnpj)) {
    return formatCpfCnpj(client.companyInfo.cnpj)
  }
  return undefined
}

/**
 * Assemble the receipt view-model from an order and (optionally) its full
 * client record. Everything shown on the receipt is derived here so the PDF
 * drawing step is pure layout. Totals are recomputed from the active orçamento
 * rather than trusting a stored total.
 */
export function buildReciboModel(pedido: Pedido, client: Client | null): ReciboModel {
  const orcamento = getActiveOrcamento(pedido)
  const itens: ReciboItem[] = getActiveItens(pedido).map((it) => ({
    quantidade: it.quantidade,
    nome: it.nome,
    descricao: nonEmpty(it.descricao) ? it.descricao : undefined,
    precoUnitario: it.precoUnitario,
    total: it.total,
  }))

  const subtotal = itens.reduce((sum, it) => sum + it.total, 0)
  const desconto = orcamento?.desconto ?? 0
  const descontoValor =
    orcamento?.descontoTipo === 'percentual' ? subtotal * (desconto / 100) : desconto
  const acrescimo = orcamento?.acrescimo ?? 0
  const frete = pedido.entrega?.freteTotal ?? 0
  const orcamentoTotal = Math.max(0, subtotal - descontoValor + acrescimo)
  const valorLiquido = orcamentoTotal + frete

  const totalPago = pedido.totalPago ?? 0
  const restante = Math.max(0, valorLiquido - totalPago)

  const entrega = formatEntregaResumo(pedido)

  const firstAddress = client?.addresses?.[0]
  const clientNome = nonEmpty(client?.name) ? (client as Client).name : pedido.clienteNome
  const rawTelefone = nonEmpty(client?.phone)
    ? (client as Client).phone
    : nonEmpty(pedido.clienteTelefone)
      ? pedido.clienteTelefone
      : undefined
  const clientTelefone = rawTelefone ? formatPhone(rawTelefone) : undefined

  const pagamentos: ReciboPayment[] = (pedido.pagamentos ?? []).map((p) => ({
    data: toDateOrNull(p.data),
    metodo: PAGAMENTO_METODO_LABELS[p.metodo] ?? p.metodo,
    valor: p.valor,
    observacao: nonEmpty(p.observacao) ? p.observacao : undefined,
  }))

  return {
    company: COMPANY_INFO,
    numeroPedido: pedido.numeroPedido,
    emissao: toDateOrNull(pedido.createdAt),
    entregaLabel: entrega.label,
    entregaDetalhe: entrega.detail,
    dataEntrega: toDateOrNull(pedido.dataEntrega),
    client: {
      nome: clientNome,
      documento: resolveDocumento(client),
      email: nonEmpty(client?.email) ? (client as Client).email : undefined,
      telefone: clientTelefone,
      endereco: formatClientAddress(firstAddress),
    },
    itens,
    totals: { subtotal, descontoValor, acrescimo, frete, valorLiquido },
    pagamentos,
    totalPago,
    restante,
    dataVencimento: toDateOrNull(pedido.dataVencimento),
    observacoes: nonEmpty(pedido.observacoes) ? pedido.observacoes : undefined,
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers (shared with the drawing step)
// ---------------------------------------------------------------------------

function formatDate(d: Date | null): string {
  return d ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : '—'
}

// ---------------------------------------------------------------------------
// Logo loading (browser only)
// ---------------------------------------------------------------------------

/**
 * Fetch an image from a public path and return it as a data URL, so jsPDF can
 * embed it via `addImage`. Returns null on any failure (the PDF still renders,
 * just without a logo).
 */
export async function loadLogoDataUrl(path: string): Promise<string | null> {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// PDF drawing
// ---------------------------------------------------------------------------

// Muted ink palette matching the reference receipts.
const INK = { r: 43, g: 43, b: 43 }
const MUTED = { r: 107, g: 114, b: 128 }
const RULE = { r: 210, g: 210, b: 210 }

// Logo native aspect ratio (396 x 128 ≈ 3.09:1).
const LOGO_W_MM = 42
const LOGO_H_MM = LOGO_W_MM * (128 / 396)

/**
 * Render the receipt as an A4 portrait PDF and return it as a Blob.
 * `logoDataUrl` may be null (letterhead simply omits the image).
 */
export async function generateReciboPDF(
  model: ReciboModel,
  logoDataUrl: string | null,
): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2

  const setInk = () => doc.setTextColor(INK.r, INK.g, INK.b)
  const setMuted = () => doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)

  // --- Letterhead (repeated on every page) ---------------------------------
  const drawHeader = (): number => {
    let hy = margin
    const company = model.company

    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', margin, hy, LOGO_W_MM, LOGO_H_MM)
      } catch {
        // ignore malformed image; header text still renders
      }
    }

    const textX = margin + LOGO_W_MM + 6
    // Reserve room on the right for the contact block so the (long) address
    // wraps within the center column instead of colliding with the email.
    const rightBlockLeft = pageWidth - margin - 50
    const centerMaxWidth = rightBlockLeft - textX - 4

    let ty = hy + 3
    setInk()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(company.tradeName, textX, ty)
    ty += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    setMuted()
    const centerLines: string[] = [
      ...(doc.splitTextToSize(`${company.address} - CEP: ${company.cep}`, centerMaxWidth) as string[]),
      company.legalName,
      `CNPJ: ${company.cnpj}`,
    ]
    for (const line of centerLines) {
      doc.text(line, textX, ty)
      ty += 4
    }

    // Right-aligned contact block.
    setInk()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(company.phone, pageWidth - margin, hy + 3, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    setMuted()
    doc.text(company.email, pageWidth - margin, hy + 9, { align: 'right' })

    hy = Math.max(hy + LOGO_H_MM, ty) + 4
    doc.setDrawColor(RULE.r, RULE.g, RULE.b)
    doc.setLineWidth(0.4)
    doc.line(margin, hy, pageWidth - margin, hy)
    return hy + 6
  }

  let pageNumber = 1
  let y = drawHeader()

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 18) {
      drawFooter(pageNumber)
      doc.addPage()
      pageNumber += 1
      y = drawHeader()
    }
  }

  const drawFooter = (page: number) => {
    setMuted()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Página ${page}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
  }

  // --- Title: "Venda {numero}" + issue date --------------------------------
  setInk()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(formatDate(model.emissao), margin, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(`Venda ${model.numeroPedido}`, pageWidth - margin, y, { align: 'right' })
  y += 8

  // --- Client box ----------------------------------------------------------
  const clientLines: string[] = []
  const docEmail = [model.client.documento && `CPF/CNPJ: ${model.client.documento}`, model.client.telefone && `Tel: ${model.client.telefone}`]
    .filter(Boolean)
    .join('   ')
  if (docEmail) clientLines.push(docEmail)
  if (model.client.email) clientLines.push(model.client.email)
  if (model.client.endereco) clientLines.push(model.client.endereco)
  if (model.entregaDetalhe) clientLines.push(`${model.entregaLabel}: ${model.entregaDetalhe}`)
  if (model.dataEntrega) clientLines.push(`Data de entrega: ${formatDate(model.dataEntrega)}`)

  const boxPadding = 4
  const boxHeight = 8 + clientLines.length * 4 + boxPadding
  ensureSpace(boxHeight + 4)
  doc.setDrawColor(RULE.r, RULE.g, RULE.b)
  doc.setLineWidth(0.4)
  doc.rect(margin, y, contentWidth, boxHeight)
  let cy = y + 6
  setInk()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(model.client.nome, margin + boxPadding, cy)
  cy += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  setMuted()
  for (const line of clientLines) {
    doc.text(line, margin + boxPadding, cy)
    cy += 4
  }
  y += boxHeight + 8

  // --- Items table ---------------------------------------------------------
  // Columns: Qt. | Produto/Serviço | Detalhe do item | Valor unitário | Subtotal
  const colQt = margin
  const colProduto = margin + 14
  const colDetalhe = margin + 74
  const colUnit = pageWidth - margin - 46
  const colSub = pageWidth - margin
  const produtoWidth = colDetalhe - colProduto - 2
  const detalheWidth = colUnit - colDetalhe - 8

  const drawTableHeader = () => {
    setInk()
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, y - 4, contentWidth, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text('Qt.', colQt + 1, y)
    doc.text('Produto/Serviço', colProduto, y)
    doc.text('Detalhe do item', colDetalhe, y)
    doc.text('Valor unitário', colUnit, y, { align: 'right' })
    doc.text('Subtotal', colSub, y, { align: 'right' })
    y += 6
  }

  ensureSpace(14)
  drawTableHeader()

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  for (const item of model.itens) {
    const nomeLines = doc.splitTextToSize(item.nome, produtoWidth) as string[]
    const detalheLines = item.descricao
      ? (doc.splitTextToSize(item.descricao, detalheWidth) as string[])
      : []
    const rowLines = Math.max(nomeLines.length, detalheLines.length, 1)
    const rowHeight = rowLines * 4 + 3

    if (y + rowHeight > pageHeight - 18) {
      drawFooter(pageNumber)
      doc.addPage()
      pageNumber += 1
      y = drawHeader()
      drawTableHeader()
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
    }

    // Top padding so text sits clear of the previous row's separator rule.
    const baseY = y + 3.4
    setInk()
    doc.text(String(item.quantidade), colQt + 1, baseY)
    nomeLines.forEach((line, i) => doc.text(line, colProduto, baseY + i * 4))
    if (detalheLines.length > 0) {
      setMuted()
      detalheLines.forEach((line, i) => doc.text(line, colDetalhe, baseY + i * 4))
      setInk()
    }
    doc.text(formatBRL(item.precoUnitario), colUnit, baseY, { align: 'right' })
    doc.text(formatBRL(item.total), colSub, baseY, { align: 'right' })

    y += rowHeight
    doc.setDrawColor(RULE.r, RULE.g, RULE.b)
    doc.setLineWidth(0.2)
    doc.line(margin, y, pageWidth - margin, y)
  }
  y += 4

  // --- Totals block (right-aligned) ----------------------------------------
  const totals = model.totals
  const totalRows: Array<[string, number, boolean]> = [
    ['Subtotal', totals.subtotal, false],
  ]
  if (totals.descontoValor > 0) totalRows.push(['Descontos', -totals.descontoValor, false])
  if (totals.acrescimo > 0) totalRows.push(['Acréscimo', totals.acrescimo, false])
  if (totals.frete > 0) totalRows.push(['Frete', totals.frete, false])
  totalRows.push(['Valor líquido', totals.valorLiquido, true])

  ensureSpace(totalRows.length * 5 + 6)
  for (const [label, value, emphasis] of totalRows) {
    doc.setFont('helvetica', emphasis ? 'bold' : 'normal')
    doc.setFontSize(emphasis ? 10 : 9)
    if (emphasis) setInk()
    else setMuted()
    doc.text(label, colUnit, y, { align: 'right' })
    doc.text(formatBRL(value), colSub, y, { align: 'right' })
    y += emphasis ? 6 : 5
  }
  y += 4

  // --- Payment section ("Condição de pagamento") ---------------------------
  ensureSpace(20)
  setInk()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Condição de pagamento', margin, y)
  y += 6

  if (model.pagamentos.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    setMuted()
    doc.text('Data', margin, y)
    doc.text('Forma de pagamento', margin + 30, y)
    doc.text('Valor (R$)', colSub, y, { align: 'right' })
    y += 5
    doc.setFont('helvetica', 'normal')
    setInk()
    for (const pay of model.pagamentos) {
      ensureSpace(6)
      doc.text(formatDate(pay.data), margin, y)
      const metodoLabel = pay.observacao ? `${pay.metodo} — ${pay.observacao}` : pay.metodo
      const metodoLines = doc.splitTextToSize(metodoLabel, colUnit - (margin + 30)) as string[]
      metodoLines.forEach((line, i) => doc.text(line, margin + 30, y + i * 4))
      doc.text(formatBRL(pay.valor), colSub, y, { align: 'right' })
      y += Math.max(metodoLines.length * 4, 5)
    }
    y += 2
  } else {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    setMuted()
    doc.text('Nenhum pagamento registrado.', margin, y)
    y += 6
  }

  // Paid / balance summary.
  ensureSpace(12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  setMuted()
  doc.text('Total pago', colUnit, y, { align: 'right' })
  doc.text(formatBRL(model.totalPago), colSub, y, { align: 'right' })
  y += 5
  doc.setFont('helvetica', 'bold')
  setInk()
  const saldoLabel = model.dataVencimento
    ? `Saldo restante (vence ${formatDate(model.dataVencimento)})`
    : 'Saldo restante'
  doc.text(saldoLabel, colUnit, y, { align: 'right' })
  doc.text(formatBRL(model.restante), colSub, y, { align: 'right' })
  y += 8

  // --- Observações (optional) ----------------------------------------------
  if (model.observacoes) {
    ensureSpace(16)
    setInk()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Observações', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    setMuted()
    const obsLines = doc.splitTextToSize(model.observacoes, contentWidth) as string[]
    for (const line of obsLines) {
      ensureSpace(5)
      doc.text(line, margin, y)
      y += 4
    }
  }

  drawFooter(pageNumber)

  return doc.output('blob')
}
