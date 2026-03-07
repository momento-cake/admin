'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { AlertTriangle, Receipt, FileText, Clock } from 'lucide-react'
import { Pedido } from '@/types/pedido'

interface NfSectionProps {
  pedido: Pedido
}

export function NfSection({ pedido }: NfSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const nfStatusLabel = pedido.nfStatus
    ? { PENDENTE: 'Pendente', EMITIDA: 'Emitida', CANCELADA: 'Cancelada' }[pedido.nfStatus]
    : null

  const nfStatusVariant = pedido.nfStatus === 'EMITIDA'
    ? 'default' as const
    : pedido.nfStatus === 'CANCELADA'
      ? 'destructive' as const
      : 'outline' as const

  const handleEmitirNf = () => {
    // TODO: integrate NF provider (NFe.io / Focus NFe / Plugnotas) — implement in future sprint
    setIsModalOpen(false)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Nota Fiscal
            </span>
            {nfStatusLabel && (
              <Badge variant={nfStatusVariant}>{nfStatusLabel}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Em Breve notice */}
          {pedido.nfStatus !== 'EMITIDA' && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium">Em Breve</span>
                <p className="text-xs mt-0.5">Emissão de nota fiscal será disponibilizada em breve.</p>
              </div>
            </div>
          )}

          {pedido.nfStatus === 'EMITIDA' ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Provedor:</span>{' '}
                <strong>{pedido.nfProvider || '-'}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">ID Externo:</span>{' '}
                <strong>{pedido.nfExternalId || '-'}</strong>
              </p>
              {pedido.nfEmittedAt && (
                <p>
                  <span className="text-muted-foreground">Emitida em:</span>{' '}
                  <strong>
                    {new Intl.DateTimeFormat('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(
                      pedido.nfEmittedAt && 'toDate' in pedido.nfEmittedAt
                        ? (pedido.nfEmittedAt as any).toDate()
                        : new Date(pedido.nfEmittedAt as any)
                    )}
                  </strong>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Nenhuma nota fiscal emitida para este pedido.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Emitir NF
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* NF Modal — placeholder */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Emitir Nota Fiscal
            </DialogTitle>
            <DialogDescription>
              Pedido {pedido.numeroPedido} — {pedido.clienteNome}
            </DialogDescription>
          </DialogHeader>

          {/* Banner */}
          <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">
              Emissão de NF será implementada em breve
            </span>
          </div>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="nf-serie">Série</Label>
              <Input id="nf-serie" placeholder="1" disabled />
            </div>
            <div>
              <Label htmlFor="nf-numero">Número</Label>
              <Input id="nf-numero" placeholder="Auto-gerado" disabled />
            </div>
            <div>
              <Label htmlFor="nf-cfop">CFOP</Label>
              <Input id="nf-cfop" placeholder="5102" disabled />
            </div>
            <div>
              <Label htmlFor="nf-natureza">Natureza da Operação</Label>
              <Input
                id="nf-natureza"
                placeholder="Venda de produção do estabelecimento"
                disabled
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled onClick={handleEmitirNf}>
              Emitir NF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
