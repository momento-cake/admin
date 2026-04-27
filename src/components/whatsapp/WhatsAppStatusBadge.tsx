'use client';

import { useEffect, useState } from 'react';
import { useWhatsAppStatus } from '@/hooks/useWhatsAppStatus';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { WhatsAppConnectionState } from '@/types/whatsapp';

const STATE_VISUALS: Record<
  WhatsAppConnectionState | 'unknown',
  {
    label: string;
    dot: string;
    ring: string;
    pulse: boolean;
    text: string;
    surface: string;
  }
> = {
  connected: {
    label: 'Conectado',
    dot: 'bg-green-500',
    ring: 'ring-green-200',
    pulse: true,
    text: 'text-green-800',
    surface: 'bg-green-50/80',
  },
  pairing: {
    label: 'Aguardando QR',
    dot: 'bg-amber-500',
    ring: 'ring-amber-200',
    pulse: false,
    text: 'text-amber-800',
    surface: 'bg-amber-50/80',
  },
  connecting: {
    label: 'Conectando…',
    dot: 'bg-amber-500',
    ring: 'ring-amber-200',
    pulse: true,
    text: 'text-amber-800',
    surface: 'bg-amber-50/80',
  },
  disconnected: {
    label: 'Desconectado',
    dot: 'bg-red-500',
    ring: 'ring-red-200',
    pulse: false,
    text: 'text-red-700',
    surface: 'bg-red-50/80',
  },
  unknown: {
    label: 'Sem status',
    dot: 'bg-zinc-400',
    ring: 'ring-zinc-200',
    pulse: false,
    text: 'text-zinc-600',
    surface: 'bg-zinc-50/80',
  },
};

function useTick(intervalMs: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

function heartbeatFreshness(seconds: number | undefined): {
  freshness: 'fresh' | 'stale' | 'cold' | 'unknown';
  label: string;
} {
  if (!seconds) return { freshness: 'unknown', label: 'sem registro' };
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - seconds);
  let label: string;
  if (diff < 60) label = `há ${diff}s`;
  else if (diff < 3600) label = `há ${Math.floor(diff / 60)}m`;
  else label = `há ${Math.floor(diff / 3600)}h`;
  if (diff < 60) return { freshness: 'fresh', label };
  if (diff < 180) return { freshness: 'stale', label };
  return { freshness: 'cold', label };
}

function tooltipText(seconds: number | undefined): string {
  if (!seconds) return 'Última atividade: sem registro';
  return `Última atividade: ${new Date(seconds * 1000).toLocaleString('pt-BR')}`;
}

export function WhatsAppStatusBadge() {
  // Tick once a second to keep the freshness label live without re-mounting.
  useTick(5000);
  const { status } = useWhatsAppStatus();
  const stateKey: WhatsAppConnectionState | 'unknown' = status?.state ?? 'unknown';
  const visual = STATE_VISUALS[stateKey];
  const heartbeatSeconds = status?.lastHeartbeatAt?.seconds;
  const { freshness, label: freshnessLabel } = heartbeatFreshness(heartbeatSeconds);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors',
              visual.surface,
              visual.ring,
              visual.text
            )}
            data-testid="whatsapp-status-badge"
          >
            {/* Dot with optional pulse halo */}
            <span className="relative inline-flex h-2 w-2 items-center justify-center">
              {visual.pulse && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inline-flex h-full w-full animate-ping rounded-full opacity-70',
                    visual.dot
                  )}
                />
              )}
              <span
                data-testid="whatsapp-status-dot"
                className={cn('relative inline-flex h-2 w-2 rounded-full', visual.dot)}
              />
            </span>
            <span>{visual.label}</span>
            {status && freshness !== 'unknown' && (
              <span
                aria-hidden="true"
                className={cn(
                  'hidden text-[10px] font-normal opacity-70 sm:inline',
                  freshness === 'fresh' && 'opacity-60',
                  freshness === 'stale' && 'text-amber-700 opacity-90',
                  freshness === 'cold' && 'text-red-600 opacity-90'
                )}
              >
                · {freshnessLabel}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>{tooltipText(heartbeatSeconds)}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
