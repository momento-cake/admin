'use client';

import { useWhatsAppStatus } from '@/hooks/useWhatsAppStatus';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { WhatsAppConnectionState } from '@/types/whatsapp';

const STATE_VISUALS: Record<
  WhatsAppConnectionState | 'unknown',
  { label: string; dot: string }
> = {
  connected: { label: 'Conectado', dot: 'bg-green-500' },
  pairing: { label: 'Aguardando QR', dot: 'bg-amber-500' },
  connecting: { label: 'Conectando…', dot: 'bg-amber-500' },
  disconnected: { label: 'Desconectado', dot: 'bg-red-500' },
  unknown: { label: 'Sem status', dot: 'bg-zinc-400' },
};

function formatHeartbeat(secondsSeconds: number | undefined): string {
  if (!secondsSeconds) return 'sem registro';
  const date = new Date(secondsSeconds * 1000);
  return date.toLocaleString('pt-BR');
}

export function WhatsAppStatusBadge() {
  const { status } = useWhatsAppStatus();
  const stateKey: WhatsAppConnectionState | 'unknown' = status?.state ?? 'unknown';
  const visual = STATE_VISUALS[stateKey];
  const heartbeatSeconds = status?.lastHeartbeatAt?.seconds;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="inline-flex items-center gap-2 rounded-full border bg-background px-2.5 py-1 text-xs font-medium"
            data-testid="whatsapp-status-badge"
          >
            <span
              data-testid="whatsapp-status-dot"
              className={cn('h-2 w-2 rounded-full', visual.dot)}
            />
            <span>{visual.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          Última atividade: {formatHeartbeat(heartbeatSeconds)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
