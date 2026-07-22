'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Search, ShoppingCart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { PedidoStatusBadge } from '@/components/pedidos/PedidoStatusBadge';
import { cn } from '@/lib/utils';
import { formatErrorMessage, logError } from '@/lib/error-handler';
import { getActiveOrcamento, formatBRL, toDateOrNull } from '@/lib/pedido-resumo';
import type { Pedido } from '@/types/pedido';

interface VincularPedidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  clienteNome: string;
  /** Called with the chosen order once the user picks it. */
  onPick: (pedido: Pedido) => void | Promise<void>;
}

function formatEntrega(pedido: Pedido): string {
  const d = toDateOrNull(pedido.dataEntrega);
  if (!d) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Pick one of a client's existing orders to attach to a mesversário month. The
 * chosen order keeps its original number (PED or MES); the caller links it via
 * the month PUT endpoint, which stamps the back-reference onto the pedido.
 *
 * Not-yet-linked orders are shown first so the common case (attaching a loose
 * order) is one click; already-linked orders remain visible but de-emphasised.
 */
export function VincularPedidoDialog({
  open,
  onOpenChange,
  clienteId,
  clienteNome,
  onPick,
}: VincularPedidoDialogProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pickingId, setPickingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ clienteId, limit: '100', page: '1' });
        const response = await fetch(`/api/pedidos?${params.toString()}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Erro ao carregar pedidos');
        if (!cancelled) setPedidos(result.data as Pedido[]);
      } catch (err) {
        if (!cancelled) {
          setError(formatErrorMessage(err));
          logError('VincularPedidoDialog.load', err);
          setPedidos([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, clienteId]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? pedidos.filter((p) => p.numeroPedido?.toLowerCase().includes(term))
      : pedidos;
    // Unlinked orders first; stable within each group.
    return [...filtered].sort((a, b) => Number(Boolean(a.mesversarioId)) - Number(Boolean(b.mesversarioId)));
  }, [pedidos, search]);

  const handlePick = async (pedido: Pedido) => {
    setPickingId(pedido.id);
    try {
      await onPick(pedido);
    } catch {
      toast.error('Erro ao vincular o pedido');
    } finally {
      setPickingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular pedido existente</DialogTitle>
          <DialogDescription>
            Escolha um pedido de {clienteNome} para vincular a este mês.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número do pedido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Carregando pedidos...
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-destructive">{error}</p>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Nenhum pedido encontrado"
            description={
              search
                ? 'Tente ajustar a busca'
                : 'Este cliente ainda não tem pedidos para vincular'
            }
          />
        ) : (
          <ul className="space-y-2">
            {visible.map((pedido) => {
              const active = getActiveOrcamento(pedido);
              const alreadyLinked = Boolean(pedido.mesversarioId);
              return (
                <li key={pedido.id}>
                  <button
                    type="button"
                    disabled={pickingId !== null}
                    onClick={() => handlePick(pedido)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors',
                      'hover:border-primary/40 hover:bg-muted/50 disabled:opacity-60',
                    )}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                          {pedido.numeroPedido}
                        </code>
                        <PedidoStatusBadge status={pedido.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Entrega: {formatEntrega(pedido)}
                        {alreadyLinked && ' · já vinculado a um mês'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold tabular-nums text-sm">
                        {formatBRL(active?.total ?? 0)}
                      </span>
                      {pickingId === pedido.id && (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
