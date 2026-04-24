'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Trash2, Paperclip, FileText, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  PAGAMENTO_METODO_LABELS,
  type Pagamento,
} from '@/types/pedido'
import { formatPrice } from '@/lib/products'
import { deleteReceipt } from '@/lib/storage'

interface PaymentListProps {
  pedidoId: string
  pagamentos: Pagamento[]
  canDelete: boolean
  onChanged: () => void
}

function toDateLoose(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  const v = value as {
    toDate?: () => Date
    _seconds?: number
    seconds?: number
  }
  if (typeof v.toDate === 'function') return v.toDate()
  if (typeof v._seconds === 'number') return new Date(v._seconds * 1000)
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000)
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function formatDate(value: unknown): string {
  const d = toDateLoose(value)
  if (!d) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function PaymentList({
  pedidoId,
  pagamentos,
  canDelete,
  onChanged,
}: PaymentListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  if (pagamentos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Nenhum pagamento registrado.
      </p>
    )
  }

  const handleDelete = async (pagamentoId: string) => {
    setDeleting(pagamentoId)
    try {
      const res = await fetch(
        `/api/pedidos/${pedidoId}/pagamentos/${pagamentoId}`,
        { method: 'DELETE' }
      )
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Erro ao excluir pagamento')
      }
      // Best-effort receipt cleanup client-side
      const path = json.data?.removed?.comprovantePath as string | undefined
      if (path) {
        try {
          await deleteReceipt(path)
        } catch (err) {
          console.warn('Falha ao apagar comprovante do storage:', err)
        }
      }
      toast.success('Pagamento excluído')
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir pagamento')
    } finally {
      setDeleting(null)
      setConfirmId(null)
    }
  }

  // Most recent first
  const sorted = [...pagamentos].sort((a, b) => {
    const ad = toDateLoose(a.data) ?? new Date(0)
    const bd = toDateLoose(b.data) ?? new Date(0)
    return bd.getTime() - ad.getTime()
  })

  return (
    <div className="divide-y rounded-md border">
      {sorted.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-3 p-3">
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{formatPrice(p.valor)}</span>
              <span className="text-muted-foreground">·</span>
              <span>{PAGAMENTO_METODO_LABELS[p.metodo]}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{formatDate(p.data)}</span>
            </div>
            {p.observacao && (
              <p className="text-xs text-muted-foreground truncate">{p.observacao}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {p.comprovanteUrl && (
              <Button
                asChild
                size="sm"
                variant="ghost"
                aria-label={`Ver comprovante de ${formatPrice(p.valor)}`}
              >
                <a href={p.comprovanteUrl} target="_blank" rel="noopener noreferrer">
                  {p.comprovanteTipo === 'pdf' ? (
                    <FileText className="h-4 w-4" />
                  ) : p.comprovanteTipo === 'image' ? (
                    <ImageIcon className="h-4 w-4" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                  <span className="sr-only">Comprovante</span>
                </a>
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Excluir pagamento de ${formatPrice(p.valor)}`}
                disabled={deleting === p.id}
                onClick={() => setConfirmId(p.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      ))}

      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação recalcula os totais e remove o comprovante. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!deleting}
              onClick={() => confirmId && handleDelete(confirmId)}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
