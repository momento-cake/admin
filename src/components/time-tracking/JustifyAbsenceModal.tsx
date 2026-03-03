'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { TimeEntry } from '@/types/time-tracking';
import { Loader2, FileCheck, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface JustifyAbsenceModalProps {
  entry: TimeEntry;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    entryId: string,
    status: 'justified_absence' | 'absent',
    reason: string
  ) => Promise<void>;
}

/**
 * CLT Art. 473 justified absence categories + CCT Clausula 37a
 */
const ABSENCE_REASONS = [
  { value: 'medical', label: 'Atestado medico' },
  { value: 'bereavement', label: 'Falecimento de familiar (CLT Art. 473 I)' },
  { value: 'bereavement_inlaw', label: 'Falecimento de sogro/sogra (CCT Clausula 37a)' },
  { value: 'wedding', label: 'Casamento (CLT Art. 473 II)' },
  { value: 'paternity', label: 'Nascimento de filho (CLT Art. 473 III)' },
  { value: 'blood_donation', label: 'Doacao de sangue (CLT Art. 473 IV)' },
  { value: 'military', label: 'Servico militar (CLT Art. 473 VI)' },
  { value: 'election', label: 'Alistamento eleitoral (CLT Art. 473 V)' },
  { value: 'court', label: 'Comparecimento em juizo (CLT Art. 473 VIII)' },
  { value: 'union', label: 'Atividade sindical (CLT Art. 473 IX)' },
  { value: 'exam', label: 'Exame vestibular (CLT Art. 473 VII)' },
  { value: 'prenatal', label: 'Consulta pre-natal (CLT Art. 473 X)' },
  { value: 'child_medical', label: 'Acompanhar filho em consulta (CLT Art. 473 XI)' },
  { value: 'other', label: 'Outro motivo justificado' },
];

export function JustifyAbsenceModal({
  entry,
  isOpen,
  onClose,
  onSave,
}: JustifyAbsenceModalProps) {
  const [category, setCategory] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!category) {
      setError('Selecione a categoria da justificativa');
      return;
    }

    const selectedReason = ABSENCE_REASONS.find((r) => r.value === category);
    const fullReason = details.trim()
      ? `${selectedReason?.label}: ${details.trim()}`
      : selectedReason?.label || category;

    if (fullReason.length < 5) {
      setError('Justificativa deve ter pelo menos 5 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await onSave(entry.id, 'justified_absence', fullReason);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao justificar falta'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
      setCategory('');
      setDetails('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Justificar Falta
          </DialogTitle>
          <DialogDescription>
            Justificando falta do dia{' '}
            {format(new Date(entry.date), "dd 'de' MMMM 'de' yyyy", {
              locale: ptBR,
            })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Motivo (CLT Art. 473)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {ABSENCE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="cursor-pointer">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Detalhes adicionais</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Informacoes complementares (opcional)..."
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="bg-muted px-3 py-2 rounded-md text-xs text-muted-foreground">
            A justificativa sera registrada no log de auditoria e preserva o DSR
            e a elegibilidade a cesta basica do funcionario.
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
              Justificar Falta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
