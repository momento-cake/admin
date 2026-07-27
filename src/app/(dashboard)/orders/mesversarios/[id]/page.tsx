'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Baby, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MesversarioTimeline } from '@/components/mesversarios/MesversarioTimeline';
import { MesversarioEditDialog } from '@/components/mesversarios/MesversarioEditDialog';
import { DeleteMesversarioDialog } from '@/components/mesversarios/DeleteMesversarioDialog';
import { useMesversario } from '@/hooks/useMesversario';
import { usePermissions } from '@/hooks/usePermissions';
import { getMesversarioProgress } from '@/lib/mesversario-utils';
import { formatDisplayDate } from '@/lib/special-dates-utils';
import { MESVERSARIO_STATUS_LABELS } from '@/types/mesversario';

export default function MesversarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    mesversario,
    isLoading,
    error,
    updateMes,
    linkPedido,
    unlinkPedido,
    updateMesversario,
    deleteMesversario,
  } = useMesversario(id);
  const { canPerformAction } = usePermissions();
  const canEdit = canPerformAction('orders', 'update');
  const canDelete = canPerformAction('orders', 'delete');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Carregando mesversário...
      </div>
    );
  }

  if (error || !mesversario) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/orders/mesversarios">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Voltar
          </Link>
        </Button>
        <p className="text-sm text-destructive">
          {error || 'Mesversário não encontrado'}
        </p>
      </div>
    );
  }

  const { done, total } = getMesversarioProgress(mesversario);
  const birthYear = Number(mesversario.dataNascimento.split('-')[0]);

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="-ml-2">
        <Link href="/orders/mesversarios">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Voltar
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Baby className="h-7 w-7 text-muted-foreground" aria-hidden />
            {mesversario.bebeNome}
          </h1>
          <p className="text-muted-foreground">
            {mesversario.clienteNome} · Nasceu em{' '}
            {formatDisplayDate(mesversario.dataNascimento, birthYear)}
          </p>
        </div>
        <div className="flex items-start gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">{MESVERSARIO_STATUS_LABELS[mesversario.status]}</p>
            <p className="text-xs text-muted-foreground">
              {done}/{total} meses
            </p>
          </div>
          {(canEdit || canDelete) && (
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden />
                  Editar
                </Button>
              )}
              {canDelete && (
                <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  Excluir
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <MesversarioTimeline
        mesversario={mesversario}
        onUpdateMes={updateMes}
        onLinkPedido={linkPedido}
        onUnlinkPedido={unlinkPedido}
      />

      {canEdit && (
        <MesversarioEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          mesversario={mesversario}
          onSave={updateMesversario}
        />
      )}
      {canDelete && (
        <DeleteMesversarioDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          mesversario={mesversario}
          onConfirm={async () => {
            await deleteMesversario();
            router.push('/orders/mesversarios');
          }}
        />
      )}
    </div>
  );
}
