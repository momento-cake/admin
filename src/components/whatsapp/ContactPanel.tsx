'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  CalendarClock,
  Loader2,
  Plus,
  Search,
  Sparkles,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { formatPhoneForDisplay } from '@/lib/phone';
import { CreatePedidoSheet } from '@/components/whatsapp/CreatePedidoSheet';
import {
  PEDIDO_STATUS_LABELS,
  type PedidoStatus,
} from '@/types/pedido';
import { STATUS_THEME } from '@/components/pedidos/statusTheme';
import { cn } from '@/lib/utils';
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
  status?: PedidoStatus | string;
  total?: number;
  createdAt?: { seconds: number };
  dataEntrega?: { seconds: number } | null;
}

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatDateShort(seconds: number | undefined | null): string | null {
  if (!seconds) return null;
  const date = new Date(seconds * 1000);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function PedidoCard({ pedido }: { pedido: PedidoSummary }) {
  const status = pedido.status as PedidoStatus | undefined;
  const theme = status && STATUS_THEME[status] ? STATUS_THEME[status] : null;
  const label = status ? PEDIDO_STATUS_LABELS[status as PedidoStatus] ?? status : null;
  const dateLabel = formatDateShort(pedido.dataEntrega?.seconds);

  return (
    <Link
      href={`/orders/${pedido.id}`}
      className="group flex flex-col gap-1.5 rounded-lg border border-border/70 bg-white px-3 py-2.5 text-xs shadow-sm transition-all hover:-translate-y-px hover:border-[var(--secondary)]/60 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold text-foreground">
          {pedido.numeroPedido}
        </span>
        {label && theme && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
              theme.softBg,
              theme.softText,
              theme.softRing
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', theme.dot)} />
            {label}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-foreground">
          {pedido.total !== undefined ? BRL.format(pedido.total) : '—'}
        </span>
        {dateLabel && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <CalendarClock className="h-3 w-3" />
            {dateLabel}
          </span>
        )}
      </div>
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
        variant="default"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full justify-start gap-2 shadow-sm"
      >
        <UserCheck className="h-4 w-4" />
        Vincular cliente existente
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-white p-3 shadow-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-8 pl-7 text-xs"
          autoFocus
        />
        {loading && (
          <Loader2 className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <ul className="max-h-40 space-y-0.5 overflow-y-auto">
        {results.map((client) => (
          <li key={client.id}>
            <button
              type="button"
              onClick={() => link(client.id)}
              disabled={linking === client.id}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-[var(--muted)]"
            >
              <span className="font-medium">{client.name}</span>
              {linking === client.id && <Loader2 className="h-3 w-3 animate-spin" />}
            </button>
          </li>
        ))}
        {!loading && debounced.length >= 2 && results.length === 0 && (
          <li className="rounded-md px-2 py-1.5 text-xs text-muted-foreground">
            Nenhum cliente encontrado.
          </li>
        )}
        {debounced.length < 2 && (
          <li className="rounded-md px-2 py-1.5 text-[11px] italic text-muted-foreground">
            Digite ao menos 2 caracteres…
          </li>
        )}
      </ul>
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
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
        className="w-full justify-start gap-2"
      >
        <UserPlus className="h-4 w-4" />
        Criar cliente rápido
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-white p-3 shadow-sm">
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
      <div className="flex justify-end gap-2">
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

function PedidoCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-white px-3 py-2.5">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-14 rounded-full" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
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

  const initials = (client?.name || conversation.clienteNome || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="space-y-3">
      {/* Identity card */}
      <Card className="overflow-hidden border-border/70">
        <CardContent className="space-y-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {conversation.profilePictureUrl && (
                <AvatarImage
                  src={conversation.profilePictureUrl}
                  alt={client?.name || conversation.clienteNome || 'Cliente vinculado'}
                />
              )}
              <AvatarFallback className="bg-[var(--primary)]/10 text-base font-semibold text-[var(--primary)]">
                {initials || <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {client?.name || conversation.clienteNome || 'Cliente vinculado'}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {formatPhoneForDisplay(conversation.phone)}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full gap-2 shadow-sm"
            onClick={() => setPedidoSheetOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Criar pedido
          </Button>
          <Link
            href={`/clients/${clienteId}`}
            className="block text-center text-[11px] font-medium text-[var(--primary)] underline-offset-4 hover:underline"
          >
            Ver perfil completo
          </Link>
        </CardContent>
      </Card>

      {/* Pedidos */}
      <Card className="overflow-hidden border-border/70">
        <CardHeader className="px-4 pb-1 pt-3">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Pedidos recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 px-4 pb-4">
          {loading ? (
            <>
              <PedidoCardSkeleton />
              <PedidoCardSkeleton />
            </>
          ) : pedidos.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/70 bg-[var(--muted)]/50 px-3 py-3 text-center text-xs text-muted-foreground">
              Nenhum pedido ainda.
            </p>
          ) : (
            pedidos.map((p) => <PedidoCard key={p.id} pedido={p} />)
          )}
        </CardContent>
      </Card>

      <CreatePedidoSheet
        open={pedidoSheetOpen}
        onOpenChange={setPedidoSheetOpen}
        conversation={conversation}
        clienteId={clienteId}
        clienteNome={client?.name || conversation.clienteNome || ''}
      />
    </div>
  );
}

function UnmatchedView({ conversation }: { conversation: WhatsAppConversation }) {
  const refresh = () => {
    // The realtime subscription on the conversation list updates automatically;
    // this is a hook for tests/extension if explicit refresh becomes needed.
  };
  return (
    <Card className="overflow-hidden border-border/70">
      <CardContent className="space-y-4 px-4 py-5">
        {/* Welcoming framing */}
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 flex-shrink-0">
            {conversation.profilePictureUrl && (
              <AvatarImage
                src={conversation.profilePictureUrl}
                alt={conversation.whatsappName || 'Contato sem nome'}
              />
            )}
            <AvatarFallback className="bg-[var(--secondary)]/20">
              <Sparkles className="h-5 w-5 text-[var(--primary)]" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-foreground">Quem é essa pessoa?</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Esse contato ainda não está cadastrado. Vincule a um cliente existente ou crie
              um cadastro rápido para começar a registrar pedidos.
            </p>
          </div>
        </div>

        {/* Identity readout */}
        <div className="space-y-2 rounded-lg bg-[var(--muted)]/50 px-3 py-2.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Telefone
            </p>
            <p className="font-mono text-sm">{formatPhoneForDisplay(conversation.phone)}</p>
          </div>
          {conversation.whatsappName && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Nome no WhatsApp
              </p>
              <p className="text-sm">{conversation.whatsappName}</p>
            </div>
          )}
        </div>

        {/* CTAs */}
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
