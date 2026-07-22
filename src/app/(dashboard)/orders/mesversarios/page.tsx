'use client';

import { useMemo, useState } from 'react';
import { Loader2, CalendarClock, CalendarHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MesversariosList } from '@/components/mesversarios/MesversariosList';
import { MesversarioFormDialog } from '@/components/mesversarios/MesversarioFormDialog';
import { MesversarioEditDialog } from '@/components/mesversarios/MesversarioEditDialog';
import { DeleteMesversarioDialog } from '@/components/mesversarios/DeleteMesversarioDialog';
import { MesStatusBadge } from '@/components/mesversarios/MesStatusBadge';
import { useMesversarios } from '@/hooks/useMesversarios';
import { useMesversariosDashboard } from '@/hooks/useMesversariosDashboard';
import { usePermissions } from '@/hooks/usePermissions';
import { getMesLabel } from '@/lib/mesversario-utils';
import type { Mesversario, MesversarioDashboardEntry } from '@/types/mesversario';

/** Next-due within ~30 days and still needing an agreement. */
function needsAgreement(e: MesversarioDashboardEntry): boolean {
  return e.daysUntil <= 30 && (e.status === 'PENDENTE' || e.status === 'EM_CONTATO');
}

function EntryRow({ entry }: { entry: MesversarioDashboardEntry }) {
  return (
    <a
      href={`/orders/mesversarios/${entry.mesversarioId}`}
      className="flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {entry.bebeNome} · {getMesLabel(entry.numero)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {entry.clienteNome} · {entry.relativeLabel}
        </p>
      </div>
      <MesStatusBadge status={entry.status} />
    </a>
  );
}

export default function MesversariosDashboardPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Mesversario | null>(null);
  const [deleting, setDeleting] = useState<Mesversario | null>(null);
  const {
    mesversarios,
    isLoading: listLoading,
    refresh: refreshList,
    createMesversario,
    updateMesversario,
    deleteMesversario,
  } = useMesversarios('ATIVO');
  const {
    entries,
    isLoading: dashLoading,
    refresh: refreshDash,
  } = useMesversariosDashboard();
  const { canPerformAction } = usePermissions();
  const canEdit = canPerformAction('orders', 'update');
  const canDelete = canPerformAction('orders', 'delete');

  const { agreementBucket, upcomingBucket } = useMemo(() => {
    const agreement = entries.filter(needsAgreement);
    const upcoming = entries.filter((e) => !needsAgreement(e));
    return { agreementBucket: agreement, upcomingBucket: upcoming };
  }, [entries]);

  const handleCreated = async () => {
    await Promise.all([refreshList(), refreshDash()]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Mesversários</h1>
          <p className="text-muted-foreground">
            Acompanhe os 12 meses de cada bebê e combine o bolo de cada mês.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Novo mesversário</Button>
      </div>

      {dashLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Carregando painel...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarHeart className="h-5 w-5 text-rose-500" aria-hidden />
                Precisam de acordo este mês
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {agreementBucket.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada pendente para os próximos 30 dias.</p>
              ) : (
                agreementBucket.map((e) => <EntryRow key={e.mesversarioId} entry={e} />)
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="h-5 w-5 text-sky-500" aria-hidden />
                Próximos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingBucket.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum próximo mês agendado.</p>
              ) : (
                upcomingBucket.map((e) => <EntryRow key={e.mesversarioId} entry={e} />)
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Ativos</h2>
        {listLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Carregando mesversários...
          </div>
        ) : (
          <MesversariosList
            mesversarios={mesversarios}
            onNew={() => setCreateOpen(true)}
            onEdit={canEdit ? setEditing : undefined}
            onDelete={canDelete ? setDeleting : undefined}
          />
        )}
      </div>

      <MesversarioFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        createMesversario={createMesversario}
        onCreated={handleCreated}
      />

      {editing && (
        <MesversarioEditDialog
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
          mesversario={editing}
          onSave={async (patch) => {
            await updateMesversario(editing.id, patch);
            await refreshDash();
          }}
        />
      )}

      {deleting && (
        <DeleteMesversarioDialog
          open={Boolean(deleting)}
          onOpenChange={(open) => !open && setDeleting(null)}
          mesversario={deleting}
          onConfirm={async () => {
            await deleteMesversario(deleting.id);
            await refreshDash();
          }}
        />
      )}
    </div>
  );
}
