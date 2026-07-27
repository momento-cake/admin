'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, PartyPopper, ImageIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { MesStatusBadge } from '@/components/mesversarios/MesStatusBadge';
import { AcordoEditor } from '@/components/mesversarios/AcordoEditor';
import { VincularPedidoDialog } from '@/components/mesversarios/VincularPedidoDialog';
import { PedidoFormDialog } from '@/components/pedidos/PedidoFormDialog';
import { getMesLabel } from '@/lib/mesversario-utils';
import { formatDisplayDate } from '@/lib/special-dates-utils';
import {
  MesStatus,
  MesversarioMes,
  MesversarioAcordoInput,
  UpdateMesData,
  MES_STATUS_LABELS,
} from '@/types/mesversario';
import type { Pedido, PedidoImagemReferenciaInput } from '@/types/pedido';

interface MesversarioMesCardProps {
  /** Parent journey id — needed to number created orders and to unlink. */
  mesversarioId: string;
  mes: MesversarioMes;
  clienteId: string;
  clienteNome: string;
  clienteTelefone?: string;
  onUpdateMes: (numero: number, patch: UpdateMesData) => Promise<void>;
  onLinkPedido: (numero: number, pedidoId: string, pedidoNumero: string) => Promise<void>;
  /** Clears the month's pedido link. Optional — the "Desvincular" action is hidden when absent. */
  onUnlinkPedido?: (numero: number) => Promise<void>;
}

/** Statuses an operator can set by hand; PEDIDO_CRIADO is set by linking an order. */
const MANUAL_STATUSES: MesStatus[] = ['PENDENTE', 'EM_CONTATO', 'ACORDADO', 'ENTREGUE', 'PULADO'];

function acordoToInput(mes: MesversarioMes): MesversarioAcordoInput {
  return {
    tema: mes.acordo?.tema,
    sabor: mes.acordo?.sabor,
    notas: mes.acordo?.notas,
    imagensReferencia: (mes.acordo?.imagensReferencia ?? []) as PedidoImagemReferenciaInput[],
  };
}

export function MesversarioMesCard({
  mesversarioId,
  mes,
  clienteId,
  clienteNome,
  clienteTelefone,
  onUpdateMes,
  onLinkPedido,
  onUnlinkPedido,
}: MesversarioMesCardProps) {
  const isMonth12 = mes.numero === 12;
  const year = Number(mes.dataComemoracao.split('-')[0]);

  const [acordoOpen, setAcordoOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [pedidoOpen, setPedidoOpen] = useState(false);
  const [vincularOpen, setVincularOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [saving, setSaving] = useState(false);

  const [acordoDraft, setAcordoDraft] = useState<MesversarioAcordoInput>(acordoToInput(mes));
  const [statusDraft, setStatusDraft] = useState<MesStatus>(mes.status);
  const [notesDraft, setNotesDraft] = useState(mes.observacoes ?? '');

  const openAcordo = () => {
    setAcordoDraft(acordoToInput(mes));
    setAcordoOpen(true);
  };

  const openStatus = () => {
    setStatusDraft(mes.status === 'PEDIDO_CRIADO' ? 'ENTREGUE' : mes.status);
    setNotesDraft(mes.observacoes ?? '');
    setStatusOpen(true);
  };

  const saveAcordo = async () => {
    setSaving(true);
    try {
      await onUpdateMes(mes.numero, { acordo: acordoDraft });
      toast.success('Acordo atualizado');
      setAcordoOpen(false);
    } catch {
      toast.error('Erro ao salvar o acordo');
    } finally {
      setSaving(false);
    }
  };

  const saveStatus = async () => {
    setSaving(true);
    try {
      await onUpdateMes(mes.numero, {
        status: statusDraft,
        observacoes: notesDraft || undefined,
      });
      toast.success('Status atualizado');
      setStatusOpen(false);
    } catch {
      toast.error('Erro ao atualizar o status');
    } finally {
      setSaving(false);
    }
  };

  const handlePedidoCreated = async (pedido: { id: string; numeroPedido: string }) => {
    setPedidoOpen(false);
    try {
      await onLinkPedido(mes.numero, pedido.id, pedido.numeroPedido);
      toast.success(`Pedido ${pedido.numeroPedido} vinculado`);
    } catch {
      toast.error('Pedido criado, mas falhou ao vincular ao mês');
    }
  };

  const handlePedidoPicked = async (pedido: Pedido) => {
    setVincularOpen(false);
    try {
      await onLinkPedido(mes.numero, pedido.id, pedido.numeroPedido);
      toast.success(`Pedido ${pedido.numeroPedido} vinculado`);
    } catch {
      toast.error('Erro ao vincular o pedido ao mês');
    }
  };

  const handleUnlink = async () => {
    if (!onUnlinkPedido) return;
    setUnlinking(true);
    try {
      await onUnlinkPedido(mes.numero);
      toast.success('Pedido desvinculado');
    } catch {
      toast.error('Erro ao desvincular o pedido');
    } finally {
      setUnlinking(false);
    }
  };

  const hasAcordo = Boolean(
    mes.acordo?.tema || mes.acordo?.sabor || mes.acordo?.notas || mes.acordo?.imagensReferencia?.length
  );

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        isMonth12 ? 'border-amber-300 bg-amber-50/60' : 'bg-card'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isMonth12 && <PartyPopper className="h-4 w-4 text-amber-600" aria-hidden />}
            <h3 className="font-medium">{getMesLabel(mes.numero)}</h3>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            {formatDisplayDate(mes.dataComemoracao, year)}
          </p>
        </div>
        <MesStatusBadge status={mes.status} />
      </div>

      {(hasAcordo || mes.pedidoNumero) && (
        <div className="mt-3 space-y-1 rounded-md bg-muted/40 p-3 text-sm">
          {mes.acordo?.tema && (
            <p>
              <span className="text-muted-foreground">Tema: </span>
              {mes.acordo.tema}
            </p>
          )}
          {mes.acordo?.sabor && (
            <p>
              <span className="text-muted-foreground">Sabor: </span>
              {mes.acordo.sabor}
            </p>
          )}
          {mes.acordo?.notas && (
            <p className="text-muted-foreground">{mes.acordo.notas}</p>
          )}
          {mes.acordo?.imagensReferencia && mes.acordo.imagensReferencia.length > 0 && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" aria-hidden />
              {mes.acordo.imagensReferencia.length}{' '}
              {mes.acordo.imagensReferencia.length === 1 ? 'imagem' : 'imagens'}
            </p>
          )}
          {mes.pedidoNumero && (
            <p className="text-xs font-medium text-indigo-700">Pedido {mes.pedidoNumero}</p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={openAcordo}>
          Editar acordo
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={openStatus}>
          Avançar status
        </Button>
        {!mes.pedidoId && (
          <>
            <Button type="button" size="sm" onClick={() => setPedidoOpen(true)}>
              Criar pedido
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVincularOpen(true)}
            >
              Vincular pedido existente
            </Button>
          </>
        )}
        {mes.pedidoId && onUnlinkPedido && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={handleUnlink}
            disabled={unlinking}
          >
            Desvincular
          </Button>
        )}
      </div>

      {/* Acordo editor dialog */}
      <Dialog open={acordoOpen} onOpenChange={setAcordoOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Acordo — {getMesLabel(mes.numero)}</DialogTitle>
          </DialogHeader>
          <AcordoEditor value={acordoDraft} onChange={setAcordoDraft} disabled={saving} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcordoOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveAcordo} disabled={saving}>
              Salvar acordo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance status dialog */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Avançar status — {getMesLabel(mes.numero)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`status-${mes.numero}`}>Status</Label>
              <Select value={statusDraft} onValueChange={(v) => setStatusDraft(v as MesStatus)}>
                <SelectTrigger id={`status-${mes.numero}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {MES_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`notes-${mes.numero}`}>Observações (opcional)</Label>
              <Textarea
                id={`notes-${mes.numero}`}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                maxLength={2000}
                placeholder="Ex.: família confirmou por WhatsApp"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveStatus} disabled={saving}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create-order surface — carries the milestone so the order is numbered MES-XXXX. */}
      <PedidoFormDialog
        open={pedidoOpen}
        onOpenChange={setPedidoOpen}
        title={`Criar pedido — ${getMesLabel(mes.numero)}`}
        initialClienteId={clienteId}
        initialClienteNome={clienteNome}
        initialClienteTelefone={clienteTelefone}
        mesversarioId={mesversarioId}
        mesNumero={mes.numero}
        onCreated={handlePedidoCreated}
      />

      {/* Link an already-existing order to this month. */}
      <VincularPedidoDialog
        open={vincularOpen}
        onOpenChange={setVincularOpen}
        clienteId={clienteId}
        clienteNome={clienteNome}
        onPick={handlePedidoPicked}
      />
    </div>
  );
}
