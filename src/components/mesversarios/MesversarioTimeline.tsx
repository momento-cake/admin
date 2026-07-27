'use client';

import { MesversarioMesCard } from '@/components/mesversarios/MesversarioMesCard';
import type { Mesversario, UpdateMesData } from '@/types/mesversario';

interface MesversarioTimelineProps {
  mesversario: Mesversario;
  onUpdateMes: (numero: number, patch: UpdateMesData) => Promise<void>;
  onLinkPedido: (numero: number, pedidoId: string, pedidoNumero: string) => Promise<void>;
  onUnlinkPedido?: (numero: number) => Promise<void>;
}

/**
 * Vertical 12-month timeline. Each month renders a MesversarioMesCard; the
 * connecting rail visually threads the journey from month 1 to "1 ano".
 */
export function MesversarioTimeline({
  mesversario,
  onUpdateMes,
  onLinkPedido,
  onUnlinkPedido,
}: MesversarioTimelineProps) {
  const meses = [...mesversario.meses].sort((a, b) => a.numero - b.numero);

  return (
    <ol className="relative space-y-4 border-l border-border pl-6">
      {meses.map((mes) => (
        <li key={mes.numero} className="relative">
          <span
            className="absolute -left-[1.9rem] top-4 h-3 w-3 rounded-full border-2 border-background bg-primary"
            aria-hidden
          />
          <MesversarioMesCard
            mesversarioId={mesversario.id}
            mes={mes}
            clienteId={mesversario.clienteId}
            clienteNome={mesversario.clienteNome}
            clienteTelefone={mesversario.clienteTelefone}
            onUpdateMes={onUpdateMes}
            onLinkPedido={onLinkPedido}
            onUnlinkPedido={onUnlinkPedido}
          />
        </li>
      ))}
    </ol>
  );
}
