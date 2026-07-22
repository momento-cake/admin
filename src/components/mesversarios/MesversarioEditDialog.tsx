'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatErrorMessage } from '@/lib/error-handler';
import {
  MESVERSARIO_STATUS_LABELS,
  type Mesversario,
  type MesversarioStatus,
  type UpdateMesversarioData,
} from '@/types/mesversario';

interface MesversarioEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mesversario: Mesversario;
  onSave: (patch: UpdateMesversarioData) => Promise<void>;
}

const STATUS_ENTRIES = Object.entries(MESVERSARIO_STATUS_LABELS) as Array<
  [MesversarioStatus, string]
>;

/**
 * Edit a mesversário's baby name, birth date, status and notes. Changing the
 * birth date recomputes the 12 celebration dates server-side while preserving
 * each month's agreement and linked order. Only changed fields are submitted.
 */
export function MesversarioEditDialog({
  open,
  onOpenChange,
  mesversario,
  onSave,
}: MesversarioEditDialogProps) {
  const [bebeNome, setBebeNome] = useState(mesversario.bebeNome);
  const [dataNascimento, setDataNascimento] = useState(mesversario.dataNascimento);
  const [status, setStatus] = useState<MesversarioStatus>(mesversario.status);
  const [observacoes, setObservacoes] = useState(mesversario.observacoes ?? '');
  const [submitting, setSubmitting] = useState(false);

  // Re-seed the form whenever the dialog (re)opens or the target changes.
  useEffect(() => {
    if (open) {
      setBebeNome(mesversario.bebeNome);
      setDataNascimento(mesversario.dataNascimento);
      setStatus(mesversario.status);
      setObservacoes(mesversario.observacoes ?? '');
    }
  }, [open, mesversario]);

  const birthDateChanged = dataNascimento !== mesversario.dataNascimento;
  const canSubmit =
    bebeNome.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(dataNascimento);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    // Build a minimal patch — only fields the user actually changed.
    const patch: UpdateMesversarioData = {};
    if (bebeNome.trim() !== mesversario.bebeNome) patch.bebeNome = bebeNome.trim();
    if (birthDateChanged) patch.dataNascimento = dataNascimento;
    if (status !== mesversario.status) patch.status = status;
    if (observacoes !== (mesversario.observacoes ?? '')) patch.observacoes = observacoes;

    if (Object.keys(patch).length === 0) {
      onOpenChange(false);
      return;
    }

    setSubmitting(true);
    try {
      await onSave(patch);
      toast.success('Mesversário atualizado');
      onOpenChange(false);
    } catch (err) {
      toast.error('Erro ao atualizar mesversário', { description: formatErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar mesversário</DialogTitle>
          <DialogDescription>
            Atualize os dados do bebê e o andamento da jornada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-bebe-nome">Nome do bebê</Label>
            <Input
              id="edit-bebe-nome"
              value={bebeNome}
              onChange={(e) => setBebeNome(e.target.value)}
              placeholder="Nome do bebê"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-data-nascimento">Data de nascimento</Label>
            <Input
              id="edit-data-nascimento"
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
            />
            {birthDateChanged && (
              <p className="text-xs text-muted-foreground">
                As 12 datas serão recalculadas; acordos e pedidos vinculados são mantidos.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as MesversarioStatus)}>
              <SelectTrigger id="edit-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ENTRIES.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-observacoes">Observações</Label>
            <Textarea
              id="edit-observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas gerais sobre a jornada"
              maxLength={2000}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
