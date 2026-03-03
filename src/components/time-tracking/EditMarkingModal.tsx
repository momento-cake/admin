'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TimeEntry, TimeMarking, MarkingType } from '@/types/time-tracking';
import { Loader2, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EditMarkingModalProps {
  entry: TimeEntry;
  marking: TimeMarking;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    entryId: string,
    markings: TimeMarking[],
    reason: string
  ) => Promise<void>;
}

const MARKING_LABELS: Record<MarkingType, string> = {
  clock_in: 'Entrada',
  lunch_out: 'Saida Almoco',
  lunch_in: 'Retorno Almoco',
  clock_out: 'Saida',
};

export function EditMarkingModal({
  entry,
  marking,
  isOpen,
  onClose,
  onSave,
}: EditMarkingModalProps) {
  const originalTime = marking.timestamp instanceof Date
    ? marking.timestamp
    : new Date(marking.timestamp);

  const [newTime, setNewTime] = useState(format(originalTime, 'HH:mm'));
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!reason.trim()) {
      setError('Motivo da alteracao e obrigatorio (Portaria 671)');
      return;
    }

    if (reason.trim().length < 5) {
      setError('Motivo deve ter pelo menos 5 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build the new timestamp from the date + new time
      const [hours, minutes] = newTime.split(':').map(Number);
      const newTimestamp = new Date(originalTime);
      newTimestamp.setHours(hours, minutes, 0, 0);

      // Create updated markings array
      const updatedMarkings = entry.markings.map((m) => {
        if (m.id === marking.id) {
          return {
            ...m,
            timestamp: newTimestamp,
            originalTimestamp: m.originalTimestamp || originalTime,
            source: 'manual' as const,
          };
        }
        return m;
      });

      await onSave(entry.id, updatedMarkings, reason.trim());
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao salvar alteracao'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
      setReason('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Editar Marcacao
          </DialogTitle>
          <DialogDescription>
            Editando {MARKING_LABELS[marking.type]} do dia{' '}
            {format(new Date(entry.date), "dd 'de' MMMM", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Horario Original</Label>
            <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
              {format(originalTime, 'HH:mm:ss')}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newTime">Novo Horario</Label>
            <Input
              id="newTime"
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              required
              className="cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo da Alteracao <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da correcao..."
              required
              minLength={5}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Obrigatorio conforme Portaria 671/2021. Sera registrado no log de auditoria.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alteracao
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
