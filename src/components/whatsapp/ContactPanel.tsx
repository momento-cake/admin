'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Loader2, Plus, Search, User, UserCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDebounce } from '@/hooks/useDebounce';
import { formatPhoneForDisplay } from '@/lib/phone';
import { CreatePedidoSheet } from '@/components/whatsapp/CreatePedidoSheet';
import type { WhatsAppConversation } from '@/types/whatsapp';

interface ContactPanelProps {
  conversation: WhatsAppConversation | null;
}

interface ClientSummary {
  id: string;
  name: string;
  email?: string;
}

interface PedidoSummary {
  id: string;
  numeroPedido: string;
  status?: string;
  total?: number;
  createdAt?: { seconds: number };
}

function PedidoRow({ pedido }: { pedido: PedidoSummary }) {
  const date = pedido.createdAt?.seconds
    ? new Date(pedido.createdAt.seconds * 1000).toLocaleDateString('pt-BR')
    : '';
  return (
    <Link
      href={`/orders/${pedido.id}`}
      className="flex items-center justify-between rounded-md border px-2.5 py-2 text-xs hover:bg-muted/60"
    >
      <span className="font-medium">{pedido.numeroPedido}</span>
      <span className="text-muted-foreground">{date}</span>
    </Link>
  );
}

function LinkClientControl({
  conversationId,
  onSuccess,
}: {
  conversationId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const debounced = useDebounce(searchInput, 250);

  useEffect(() => {
    if (!open || debounced.length < 2) {
      setResults([]);
      return;
    }
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/clients?searchQuery=${encodeURIComponent(debounced)}&limit=10`
        );
        const data = await res.json();
        setResults(data?.data?.clients ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchResults();
  }, [debounced, open]);

  const link = async (clientId: string) => {
    setLinking(clientId);
    try {
      const res = await fetch(`/api/whatsapp/conversations/${conversationId}/link-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Erro ao vincular cliente');
      }
      toast.success('Cliente vinculado');
      setOpen(false);
      setSearchInput('');
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao vincular';
      toast.error('Erro ao vincular cliente', { description: message });
    } finally {
      setLinking(null);
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full justify-start"
      >
        <UserCheck className="mr-2 h-4 w-4" />
        Vincular cliente existente
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-8 pl-7 text-xs"
        />
        {loading && (
          <Loader2 className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <ul className="max-h-40 space-y-1 overflow-y-auto">
        {results.map((client) => (
          <li key={client.id}>
            <button
              type="button"
              onClick={() => link(client.id)}
              disabled={linking === client.id}
              className="flex w-full items-center justify-between rounded px-2 py-1 text-xs hover:bg-muted/70"
            >
              <span>{client.name}</span>
              {linking === client.id && <Loader2 className="h-3 w-3 animate-spin" />}
            </button>
          </li>
        ))}
        {!loading && debounced.length >= 2 && results.length === 0 && (
          <li className="px-2 py-1 text-xs text-muted-foreground">Nenhum cliente encontrado.</li>
        )}
      </ul>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancelar
      </Button>
    </div>
  );
}

function QuickCreateControl({
  conversationId,
  defaultPhone,
  onSuccess,
}: {
  conversationId: string;
  defaultPhone: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/whatsapp/conversations/${conversationId}/quick-create-client`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Erro ao criar cliente');
      }
      toast.success('Cliente criado');
      setOpen(false);
      setName('');
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar cliente';
      toast.error('Erro ao criar cliente', { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full justify-start"
      >
        <UserPlus className="mr-2 h-4 w-4" />
        Criar cliente rápido
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="space-y-1">
        <Label htmlFor="qc-name" className="text-xs">
          Nome
        </Label>
        <Input
          id="qc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-xs"
          autoFocus
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="qc-phone" className="text-xs">
          Telefone
        </Label>
        <Input
          id="qc-phone"
          value={formatPhoneForDisplay(defaultPhone)}
          readOnly
          className="h-8 bg-muted text-xs"
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={!name.trim() || submitting}>
          {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Criar'}
        </Button>
      </div>
    </div>
  );
}

function LinkedClientView({ conversation }: { conversation: WhatsAppConversation }) {
  const clienteId = conversation.clienteId!;
  const [client, setClient] = useState<ClientSummary | null>(null);
  const [pedidos, setPedidos] = useState<PedidoSummary[]>([]);
  const [pedidoSheetOpen, setPedidoSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [clientRes, pedidosRes] = await Promise.all([
          fetch(`/api/clients/${clienteId}`),
          fetch(`/api/pedidos?clienteId=${clienteId}&limit=5`),
        ]);
        const clientJson = await clientRes.json().catch(() => ({}));
        const pedidosJson = await pedidosRes.json().catch(() => ({}));
        if (!active) return;
        if (clientJson?.success) setClient(clientJson.data);
        if (pedidosJson?.success) setPedidos(pedidosJson.data?.pedidos ?? []);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [clienteId]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4" />
          {client?.name || conversation.clienteNome || 'Cliente vinculado'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div>
          <p className="text-muted-foreground">Telefone</p>
          <p>{formatPhoneForDisplay(conversation.phone)}</p>
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={() => setPedidoSheetOpen(true)}
        >
          <Plus className="mr-2 h-3.5 w-3.5" /> Criar pedido
        </Button>
        <Link
          href={`/clients/${clienteId}`}
          className="block text-center text-xs text-primary underline-offset-2 hover:underline"
        >
          Ver perfil completo
        </Link>
        <div>
          <p className="mb-1 text-muted-foreground">Pedidos recentes</p>
          {loading ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : pedidos.length === 0 ? (
            <p className="text-muted-foreground">Nenhum pedido ainda.</p>
          ) : (
            <ul className="space-y-1">
              {pedidos.map((p) => (
                <li key={p.id}>
                  <PedidoRow pedido={p} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <CreatePedidoSheet
          open={pedidoSheetOpen}
          onOpenChange={setPedidoSheetOpen}
          conversation={conversation}
          clienteId={clienteId}
          clienteNome={client?.name || conversation.clienteNome || ''}
        />
      </CardContent>
    </Card>
  );
}

function UnmatchedView({ conversation }: { conversation: WhatsAppConversation }) {
  const refresh = () => {
    // The realtime subscription on the conversation list updates automatically;
    // this is a hook for tests/extension if explicit refresh becomes needed.
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Contato sem cadastro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div>
          <p className="text-muted-foreground">Telefone</p>
          <p>{formatPhoneForDisplay(conversation.phone)}</p>
        </div>
        {conversation.whatsappName && (
          <div>
            <p className="text-muted-foreground">Nome no WhatsApp</p>
            <p>{conversation.whatsappName}</p>
          </div>
        )}
        <div className="space-y-2">
          <LinkClientControl conversationId={conversation.id} onSuccess={refresh} />
          <QuickCreateControl
            conversationId={conversation.id}
            defaultPhone={conversation.phone}
            onSuccess={refresh}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function ContactPanel({ conversation }: ContactPanelProps) {
  if (!conversation) return null;
  if (conversation.clienteId) {
    return <LinkedClientView conversation={conversation} />;
  }
  return <UnmatchedView conversation={conversation} />;
}
