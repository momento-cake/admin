'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TimeEntry, TimeMarking, MarkingType } from '@/types/time-tracking';
import { Loader2, Plus, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AddMarkingModalProps {
  entry: TimeEntry;
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

const ALL_MARKING_TYPES: MarkingType[] = [
  'clock_in',
  'lunch_out',
  'lunch_in',
  'clock_out',
];

export function AddMarkingModal({
  entry,
  isOpen,
  onClose,
  onSave,
}: AddMarkingModalProps) {
  const existingTypes = entry.markings.map((m) => m.type);
  const missingTypes = ALL_MARKING_TYPES.filter(
    (t) => !existingTypes.includes(t)
  );

  const [selectedType, setSelectedType] = useState<MarkingType | ''>(
    missingTypes[0] || ''
  );
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!selectedType) {
      setError('Selecione o tipo de marcacao');
      return;
    }

    if (!time) {
      setError('Informe o horario');
      return;
    }

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

      // Build the timestamp from the entry date + time
      const [hours, minutes] = time.split(':').map(Number);
      const timestamp = new Date(entry.date + 'T00:00:00');
      timestamp.setHours(hours, minutes, 0, 0);

      const newMarking: TimeMarking = {
        id: `mk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        type: selectedType,
        timestamp,
        source: 'manual',
        createdAt: new Date(),
        createdBy: '', // Will be set by the API
      };

      // Add new marking and sort by marking order
      const orderMap: Record<MarkingType, number> = {
        clock_in: 0,
        lunch_out: 1,
        lunch_in: 2,
        clock_out: 3,
      };
      const updatedMarkings = [...entry.markings, newMarking].sort(
        (a, b) => orderMap[a.type] - orderMap[b.type]
      );

      await onSave(entry.id, updatedMarkings, reason.trim());
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao adicionar marcacao'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
      setReason('');
      setTime('');
      setSelectedType(missingTypes[0] || '');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Marcacao
          </DialogTitle>
          <DialogDescription>
            Adicionando marcacao ao dia{' '}
            {format(new Date(entry.date), "dd 'de' MMMM", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        {missingTypes.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            Todas as marcacoes ja foram registradas para este dia.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Marcacao</Label>
              <Select
                value={selectedType}
                onValueChange={(val) => setSelectedType(val as MarkingType)}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {missingTypes.map((type) => (
                    <SelectItem key={type} value={type} className="cursor-pointer">
                      {MARKING_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Horario</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">
                Motivo <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo da insercao manual..."
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
                Adicionar Marcacao
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
