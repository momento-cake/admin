'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Baby } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MesversarioTimeline } from '@/components/mesversarios/MesversarioTimeline';
import { useMesversario } from '@/hooks/useMesversario';
import { getMesversarioProgress } from '@/lib/mesversario-utils';
import { formatDisplayDate } from '@/lib/special-dates-utils';
import { MESVERSARIO_STATUS_LABELS } from '@/types/mesversario';

export default function MesversarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { mesversario, isLoading, error, updateMes, linkPedido } = useMesversario(id);

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
        <div className="text-right">
          <p className="text-sm font-medium">{MESVERSARIO_STATUS_LABELS[mesversario.status]}</p>
          <p className="text-xs text-muted-foreground">
            {done}/{total} meses
          </p>
        </div>
      </div>

      <MesversarioTimeline
        mesversario={mesversario}
        onUpdateMes={updateMes}
        onLinkPedido={linkPedido}
      />
    </div>
  );
}
