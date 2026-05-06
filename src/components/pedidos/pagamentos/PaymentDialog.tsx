'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Paperclip, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  PAGAMENTO_METODO_LABELS,
  type PagamentoMetodo,
} from '@/types/pedido'
import { uploadReceipt, deleteReceipt } from '@/lib/storage'
import { validateReceiptFile } from '@/lib/validators/receipt'
import { formatPrice } from '@/lib/products'
import { roundCurrency } from '@/lib/payment-logic'
import { describeError, logError, parseApiResponse } from '@/lib/error-handler'

interface PaymentDialogProps {
  pedidoId: string
  total: number
  totalPago: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegistered: () => void
}

const METODO_ORDER: PagamentoMetodo[] = [
  'PIX',
  'DINHEIRO',
  'CARTAO_CREDITO',
  'CARTAO_DEBITO',
  'BOLETO',
  'TRANSFERENCIA',
  'OUTRO',
]

function todayInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function PaymentDialog({
  pedidoId,
  total,
  totalPago,
  open,
  onOpenChange,
  onRegistered,
}: PaymentDialogProps) {
  const saldo = useMemo(
    () => roundCurrency(Math.max(0, total - totalPago)),
    [total, totalPago]
  )

  const [valor, setValor] = useState<string>(String(saldo || ''))
  const [metodo, setMetodo] = useState<PagamentoMetodo>('PIX')
  const [data, setData] = useState<string>(todayInput())
  const [observacao, setObservacao] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const numericValor = Number.parseFloat(valor || '0')

  const saldoApos = useMemo(
    () =>
      roundCurrency(
        Math.max(0, total - totalPago - (isNaN(numericValor) ? 0 : numericValor))
      ),
    [total, totalPago, numericValor]
  )

  const handleFilePick = (file: File | null) => {
    if (!file) {
      setReceipt(null)
      return
    }
    const validation = validateReceiptFile(file)
    if (!validation.isValid) {
      toast.error('Arquivo inválido', {
        description: validation.error ?? 'Tente um arquivo diferente.',
      })
      return
    }
    setReceipt(file)
  }

  const reset = () => {
    setValor(String(saldo || ''))
    setMetodo('PIX')
    setData(todayInput())
    setObservacao('')
    setReceipt(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!numericValor || numericValor <= 0) {
      toast.error('Valor inválido', {
        description: 'Informe um valor maior que zero.',
      })
      return
    }

    if (numericValor > saldo) {
      toast.error('Valor excede o saldo', {
        description:
          'O valor informado é maior que o saldo em aberto. Ajuste o valor antes de salvar.',
      })
      return
    }

    setSubmitting(true)
    let uploaded: Awaited<ReturnType<typeof uploadReceipt>> | null = null
    let orphanPath: string | null = null
    const pagamentoId = crypto.randomUUID()

    try {
      if (receipt) {
        uploaded = await uploadReceipt({
          file: receipt,
          pedidoId,
          pagamentoId,
        })
        // Track storage path so we can clean up if the metadata POST fails.
        orphanPath = uploaded.storagePath
      }

      const body: Record<string, unknown> = {
        pagamentoId,
        data: new Date(data).toISOString(),
        valor: numericValor,
        metodo,
      }
      if (observacao.trim()) body.observacao = observacao.trim()
      if (uploaded) {
        body.comprovanteUrl = uploaded.url
        body.comprovantePath = uploaded.storagePath
        body.comprovanteTipo = uploaded.kind
      }

      try {
        const res = await fetch(`/api/pedidos/${pedidoId}/pagamentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        await parseApiResponse(res)
        // POST succeeded — comprovante is referenced by the pagamento doc, no longer orphan.
        orphanPath = null
      } catch (postErr) {
        // Best-effort cleanup of the orphaned receipt before surfacing the error.
        if (orphanPath) {
          try {
            await deleteReceipt(orphanPath)
          } catch (cleanupErr) {
            logError('PaymentDialog.cleanupOrphanReceipt', cleanupErr)
          }
          orphanPath = null
        }
        throw postErr
      }

      toast.success('Pagamento registrado')
      reset()
      onRegistered()
      onOpenChange(false)
    } catch (error) {
      logError('PaymentDialog.handleSubmit', error)
      toast.error('Erro ao registrar pagamento', {
        description: describeError(error),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>
            Saldo em aberto: <strong>{formatPrice(saldo)}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="data">Data do Pagamento</Label>
            <Input
              id="data"
              type="date"
              value={data}
              max={todayInput()}
              onChange={(e) => setData(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="valor">Valor</Label>
            <Input
              id="valor"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Saldo após este pagamento:{' '}
              <strong className={saldoApos === 0 ? 'text-emerald-700' : ''}>
                {formatPrice(saldoApos)}
              </strong>
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="metodo">Método</Label>
            <Select
              value={metodo}
              onValueChange={(v) => setMetodo(v as PagamentoMetodo)}
            >
              <SelectTrigger id="metodo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METODO_ORDER.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAGAMENTO_METODO_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              maxLength={500}
              placeholder="Ex.: sinal de 50%, entregue em espécie..."
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="receipt">Comprovante (opcional)</Label>
            {receipt ? (
              <div className="flex items-center justify-between rounded-md border bg-muted px-3 py-2 text-sm">
                <span className="flex items-center gap-2 truncate">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span className="truncate">{receipt.name}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReceipt(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Input
                id="receipt"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
              />
            )}
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG ou WebP — até 5 MB
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
