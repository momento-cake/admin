'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { AlertTriangle, Receipt, FileText, Download, Printer, Loader2, Ban } from 'lucide-react'
import { Pedido, type NfModelo } from '@/types/pedido'
import { formatChaveAcesso } from '@/lib/danfe-nfce-thermal'
import { toDateOrNull } from '@/lib/pedido-resumo'
import { useEmitirNf } from '@/hooks/useEmitirNf'

interface NfSectionProps {
  pedido: Pedido
  /** Called after a successful emission or cancellation so the parent refetches. */
  onEmitted?: () => void
}

const MODELO_LABEL: Record<NfModelo, string> = {
  55: 'NF-e (55) — online',
  65: 'NFC-e (65) — loja',
}

const JUST_MIN = 15
const JUST_MAX = 255

function formatDateTime(value: unknown): string {
  const d = toDateOrNull(value)
  return d ? format(d, 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'
}

export function NfSection({ pedido, onEmitted }: NfSectionProps) {
  // Default the model from the order's sales channel: online ⇒ NF-e, else NFC-e.
  const [modelo, setModelo] = useState<NfModelo>(pedido.origem === 'ONLINE' ? 55 : 65)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const {
    emit,
    emitting,
    error,
    rejection,
    printNfce,
    printing,
    printError,
    cancel,
    cancelling,
    cancelError,
    cancelRejection,
  } = useEmitirNf(pedido)

  const isEmitted = pedido.nfStatus === 'EMITIDA'
  const isCancelled = pedido.nfStatus === 'CANCELADA'

  // 55 (NF-e) is only valid for paid online orders; 65 (NFC-e) is always
  // available for an un-emitted order.
  const canEmit55 = !!pedido.billing && pedido.statusPagamento === 'PAGO' && !isEmitted
  const canEmit65 = !isEmitted
  const canEmit = modelo === 55 ? canEmit55 : canEmit65

  const justTrimmed = justificativa.trim()
  const justValid = justTrimmed.length >= JUST_MIN && justTrimmed.length <= JUST_MAX

  const handleEmit = async () => {
    const res = await emit(modelo)
    if (res) onEmitted?.()
  }

  const handleReprint = () => {
    void printNfce({
      modelo: (pedido.nfModelo ?? 65) as NfModelo,
      serie: pedido.nfSerie ?? 0,
      numero: pedido.nfNumero ?? 0,
      accessKey: pedido.nfAccessKey ?? '',
      protocolo: pedido.nfProtocolo ?? undefined,
      qrCode: pedido.nfQrCode ?? undefined,
      urlChave: pedido.nfUrlChave ?? undefined,
      ambiente: pedido.nfAmbiente ?? 'homologacao',
    })
  }

  const handleCancel = async () => {
    if (!justValid) return
    const res = await cancel(justTrimmed)
    if (res) {
      setCancelOpen(false)
      setJustificativa('')
      onEmitted?.()
    }
  }

  const statusVariant = isEmitted
    ? ('default' as const)
    : isCancelled
      ? ('destructive' as const)
      : ('outline' as const)
  const statusLabel = pedido.nfStatus
    ? { PENDENTE: 'Pendente', EMITIDA: 'Emitida', CANCELADA: 'Cancelada' }[pedido.nfStatus]
    : null

  const downloadButtons = (
    <>
      <Button asChild variant="outline" size="sm">
        <a href={`/api/pedidos/${pedido.id}/nf/danfe`} target="_blank" rel="noreferrer">
          <Download className="h-4 w-4 mr-2" />
          Baixar DANFE
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`/api/pedidos/${pedido.id}/nf/xml`} target="_blank" rel="noreferrer">
          <FileText className="h-4 w-4 mr-2" />
          Baixar XML
        </a>
      </Button>
    </>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Nota Fiscal
          </span>
          {statusLabel && <Badge variant={statusVariant}>{statusLabel}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isCancelled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{pedido.nfModelo === 55 ? 'NF-e' : 'NFC-e'}</Badge>
              {pedido.nfNumero != null && (
                <span className="text-sm text-muted-foreground">
                  Nº {pedido.nfNumero} · Série {pedido.nfSerie ?? '-'}
                </span>
              )}
            </div>

            <Alert variant="destructive">
              <Ban className="h-4 w-4" />
              <AlertDescription>
                Nota fiscal cancelada.
                {pedido.nfCancelledAt != null && ` Em ${formatDateTime(pedido.nfCancelledAt)}.`}
              </AlertDescription>
            </Alert>

            {pedido.nfCancelJustificativa && (
              <div className="text-sm">
                <span className="text-muted-foreground">Justificativa:</span>
                <p className="mt-0.5">{pedido.nfCancelJustificativa}</p>
              </div>
            )}
            {pedido.nfCancelProtocolo && (
              <div className="text-sm">
                <span className="text-muted-foreground">Protocolo de cancelamento:</span>{' '}
                <span className="font-mono text-xs">{pedido.nfCancelProtocolo}</span>
              </div>
            )}

            {/* Downloads stay available; the NFC-e coupon must NOT be re-printed. */}
            <div className="flex flex-wrap gap-2">{downloadButtons}</div>
          </div>
        ) : isEmitted ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{pedido.nfModelo === 55 ? 'NF-e' : 'NFC-e'}</Badge>
              {pedido.nfNumero != null && (
                <span className="text-sm text-muted-foreground">
                  Nº {pedido.nfNumero} · Série {pedido.nfSerie ?? '-'}
                </span>
              )}
            </div>

            {pedido.nfAccessKey && (
              <div className="text-sm">
                <span className="text-muted-foreground">Chave de acesso:</span>
                <p className="font-mono text-xs break-all mt-0.5">
                  {formatChaveAcesso(pedido.nfAccessKey)}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {downloadButtons}
              {pedido.nfModelo === 65 && (
                <Button variant="outline" size="sm" onClick={handleReprint} disabled={printing}>
                  {printing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4 mr-2" />
                  )}
                  Imprimir DANFE-NFC-e
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}>
                <Ban className="h-4 w-4 mr-2" />
                Cancelar NF
              </Button>
            </div>

            {printError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Não foi possível imprimir. Abra a impressão pelo navegador e tente novamente.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Nenhuma nota fiscal emitida para este pedido.
            </p>

            {/* Model selector */}
            <div className="inline-flex rounded-md border p-0.5">
              <Button
                type="button"
                size="sm"
                variant={modelo === 65 ? 'default' : 'ghost'}
                onClick={() => setModelo(65)}
              >
                {MODELO_LABEL[65]}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={modelo === 55 ? 'default' : 'ghost'}
                onClick={() => setModelo(55)}
              >
                {MODELO_LABEL[55]}
              </Button>
            </div>

            {modelo === 55 && !canEmit55 && (
              <p className="text-xs text-muted-foreground">
                Disponível apenas para pedidos online pagos.
              </p>
            )}

            <div>
              <Button type="button" onClick={handleEmit} disabled={!canEmit || emitting}>
                {emitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Comunicando com a SEFAZ...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Emitir NF
                  </>
                )}
              </Button>
            </div>

            {rejection && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  NF rejeitada pela SEFAZ: {rejection.message}
                  {rejection.code ? ` (${rejection.code})` : ''}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>

      {/* Cancellation confirm dialog */}
      <Dialog open={cancelOpen} onOpenChange={(open) => !cancelling && setCancelOpen(open)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Cancelar Nota Fiscal
            </DialogTitle>
            <DialogDescription>
              Pedido {pedido.numeroPedido} — informe a justificativa exigida pela SEFAZ.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="nf-cancel-justificativa">Justificativa</Label>
            <Textarea
              id="nf-cancel-justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              maxLength={JUST_MAX}
              rows={3}
              placeholder="Motivo do cancelamento (mínimo 15 caracteres)"
              disabled={cancelling}
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {justTrimmed.length > 0 && !justValid
                  ? `A justificativa deve ter entre ${JUST_MIN} e ${JUST_MAX} caracteres.`
                  : ''}
              </span>
              <span className="text-muted-foreground">
                {justificativa.length}/{JUST_MAX}
              </span>
            </div>

            {cancelRejection && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Cancelamento rejeitado pela SEFAZ: {cancelRejection.message}
                  {cancelRejection.code ? ` (${cancelRejection.code})` : ''}
                </AlertDescription>
              </Alert>
            )}
            {cancelError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{cancelError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={cancelling}
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancel}
              disabled={!justValid || cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelando na SEFAZ...
                </>
              ) : (
                'Confirmar cancelamento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
