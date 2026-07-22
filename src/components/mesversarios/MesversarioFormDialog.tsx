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
import { ClienteSelector } from '@/components/pedidos/ClienteSelector';
import { parseApiResponse, formatErrorMessage } from '@/lib/error-handler';
import type { CreateMesversarioData } from '@/types/mesversario';
import type { RelatedPerson } from '@/types/client';

interface SelectedCliente {
  id: string;
  nome: string;
  telefone?: string;
}

interface MesversarioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createMesversario: (data: CreateMesversarioData) => Promise<{ id: string }>;
  onCreated?: (result: { id: string }) => void;
}

const NEW_CHILD = '__new__';

/**
 * Start-a-mesversário flow: pick a client, choose one of their children (the
 * baby = a RelatedPerson of relationship 'child'), or add a child inline. The
 * baby name + birth date are the single source of truth for the 12 milestones.
 */
export function MesversarioFormDialog({
  open,
  onOpenChange,
  createMesversario,
  onCreated,
}: MesversarioFormDialogProps) {
  const [cliente, setCliente] = useState<SelectedCliente | null>(null);
  const [children, setChildren] = useState<RelatedPerson[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [newChildName, setNewChildName] = useState('');
  const [newChildBirth, setNewChildBirth] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset everything whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setCliente(null);
      setChildren([]);
      setSelectedChildId('');
      setNewChildName('');
      setNewChildBirth('');
    }
  }, [open]);

  const loadChildren = async (clientId: string) => {
    setLoadingChildren(true);
    try {
      const response = await fetch(`/api/clients/${clientId}`);
      const data = await parseApiResponse<{ relatedPersons?: RelatedPerson[] }>(response);
      const kids = (data?.relatedPersons ?? []).filter((p) => p.relationship === 'child');
      setChildren(kids);
      // Default to the first existing child, otherwise the "new child" option.
      setSelectedChildId(kids.length > 0 ? kids[0].id : NEW_CHILD);
    } catch (err) {
      toast.error('Erro ao carregar os bebês do cliente', {
        description: formatErrorMessage(err),
      });
      setChildren([]);
      setSelectedChildId(NEW_CHILD);
    } finally {
      setLoadingChildren(false);
    }
  };

  const handleSelectCliente = (c: SelectedCliente) => {
    setCliente(c);
    loadChildren(c.id);
  };

  const isNewChild = selectedChildId === NEW_CHILD;

  /**
   * Persist a new child onto the client (append to relatedPersons via the
   * clients API) and return its generated id.
   */
  const createChildOnClient = async (clientId: string): Promise<RelatedPerson> => {
    const getRes = await fetch(`/api/clients/${clientId}`);
    const client = await parseApiResponse<{ relatedPersons?: RelatedPerson[] }>(getRes);
    const child: RelatedPerson = {
      id: crypto.randomUUID(),
      name: newChildName.trim(),
      relationship: 'child',
      birthDate: newChildBirth,
    };
    const relatedPersons = [...(client?.relatedPersons ?? []), child];
    const putRes = await fetch(`/api/clients/${clientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relatedPersons }),
    });
    await parseApiResponse(putRes);
    return child;
  };

  const canSubmit = (() => {
    if (!cliente) return false;
    if (isNewChild) return newChildName.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(newChildBirth);
    const child = children.find((c) => c.id === selectedChildId);
    return Boolean(child?.birthDate);
  })();

  const handleSubmit = async () => {
    if (!cliente) return;
    setSubmitting(true);
    try {
      let relatedPersonId: string;
      let bebeNome: string;
      let dataNascimento: string;

      if (isNewChild) {
        const child = await createChildOnClient(cliente.id);
        relatedPersonId = child.id;
        bebeNome = child.name;
        dataNascimento = child.birthDate!;
      } else {
        const child = children.find((c) => c.id === selectedChildId);
        if (!child?.birthDate) {
          toast.error('Este bebê não tem data de nascimento cadastrada');
          setSubmitting(false);
          return;
        }
        relatedPersonId = child.id;
        bebeNome = child.name;
        dataNascimento = child.birthDate;
      }

      const result = await createMesversario({
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        clienteTelefone: cliente.telefone,
        relatedPersonId,
        bebeNome,
        dataNascimento,
      });

      toast.success('Mesversário criado');
      onOpenChange(false);
      onCreated?.(result);
    } catch (err) {
      toast.error('Erro ao criar mesversário', { description: formatErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo mesversário</DialogTitle>
          <DialogDescription>
            Escolha o cliente e o bebê para acompanhar os 12 meses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <ClienteSelector
              selectedClient={cliente}
              onSelect={handleSelectCliente}
              onClear={() => {
                setCliente(null);
                setChildren([]);
                setSelectedChildId('');
              }}
            />
          </div>

          {cliente && (
            <div className="space-y-2">
              <Label>Bebê</Label>
              {loadingChildren ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Carregando bebês...
                </div>
              ) : (
                <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o bebê" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.birthDate ? ` — ${c.birthDate}` : ' (sem data de nascimento)'}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW_CHILD}>+ Cadastrar novo bebê</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {cliente && !loadingChildren && isNewChild && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-2">
                <Label htmlFor="new-child-name">Nome do bebê</Label>
                <Input
                  id="new-child-name"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  placeholder="Nome do bebê"
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-child-birth">Data de nascimento</Label>
                <Input
                  id="new-child-birth"
                  type="date"
                  value={newChildBirth}
                  onChange={(e) => setNewChildBirth(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Criar mesversário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
