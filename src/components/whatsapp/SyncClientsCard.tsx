'use client';

/**
 * Admin-only card on /whatsapp/settings that triggers the CRM cross-reference
 * job (Strategy B). One-click "Sincronizar contatos do CRM":
 *
 *  1. POST /api/whatsapp/sync-clients — creates a `whatsapp_sync_jobs` doc.
 *  2. The worker subscribes to that collection, runs `sock.onWhatsApp(...)`,
 *     and creates placeholder conversations.
 *  3. We subscribe to the job doc here to surface progress + result.
 *
 * Idempotent on the worker side: re-running creates fresh jobs but does not
 * overwrite real conversations.
 */

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Loader2, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { WhatsAppSyncJob } from '@/types/whatsapp';

interface JobState {
  id: string;
  data: WhatsAppSyncJob | null;
}

const JOBS_COLLECTION = 'whatsapp_sync_jobs';

export function SyncClientsCard() {
  const { isPlatformAdmin } = useAuthContext();
  const [submitting, setSubmitting] = useState(false);
  const [jobState, setJobState] = useState<JobState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to the active job's doc whenever we have an id.
  useEffect(() => {
    if (!jobState?.id) return;
    const ref = doc(db, JOBS_COLLECTION, jobState.id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setJobState((cur) => (cur ? { ...cur, data: null } : cur));
          return;
        }
        const data = snap.data() as WhatsAppSyncJob;
        setJobState((cur) => (cur ? { ...cur, data } : cur));
      },
      (err) => {
        setError(err instanceof Error ? err.message : String(err));
      },
    );
    return () => unsub();
  }, [jobState?.id]);

  if (!isPlatformAdmin()) return null;

  const handleSync = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/whatsapp/sync-clients', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Falha ao iniciar sincronização');
      }
      setJobState({ id: json.data.jobId, data: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const status = jobState?.data?.status;
  const statusLabel =
    status === 'running'
      ? 'Verificando contatos no WhatsApp…'
      : status === 'pending'
        ? 'Na fila para processamento'
        : status === 'complete'
          ? `Concluído — ${jobState?.data?.matched ?? 0} contatos com WhatsApp, ${jobState?.data?.created ?? 0} novos na inbox`
          : status === 'failed'
            ? `Erro: ${jobState?.data?.error ?? 'desconhecido'}`
            : null;

  return (
    <Card data-testid="sync-clients-card" className="overflow-hidden">
      <CardContent className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--secondary)]/15 text-[var(--primary)]">
            <Users className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Sincronizar contatos do CRM</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Cria atalhos na inbox para todos os clientes ativos que têm WhatsApp,
              mesmo antes de qualquer mensagem trocada. Útil para iniciar o primeiro contato
              sem precisar buscar o telefone.
            </p>
            {statusLabel && (
              <p
                data-testid="sync-clients-status"
                className={cn(
                  'pt-1 text-xs',
                  status === 'failed' ? 'text-red-700' : 'text-muted-foreground',
                )}
              >
                {statusLabel}
              </p>
            )}
            {error && (
              <p data-testid="sync-clients-error" className="pt-1 text-xs text-red-700">
                {error}
              </p>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleSync}
          disabled={submitting || status === 'pending' || status === 'running'}
          data-testid="sync-clients-button"
        >
          {submitting || status === 'pending' || status === 'running' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {status === 'pending' || status === 'running'
            ? 'Sincronizando…'
            : 'Sincronizar agora'}
        </Button>
      </CardContent>
    </Card>
  );
}
