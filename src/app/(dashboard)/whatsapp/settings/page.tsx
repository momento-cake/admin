'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  QrCode,
  Smartphone,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { WhatsAppStatusBadge } from '@/components/whatsapp/WhatsAppStatusBadge';
import { useWhatsAppStatus } from '@/hooks/useWhatsAppStatus';
import { formatPhoneForDisplay } from '@/lib/phone';
import { cn } from '@/lib/utils';
import type { WhatsAppStatus } from '@/types/whatsapp';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function useTick(intervalMs: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

function relativeSeconds(seconds: number | undefined): string {
  if (!seconds) return 'sem registro';
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - seconds);
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)}m`;
  return `há ${Math.floor(diff / 3600)}h`;
}

function absoluteTime(seconds: number | undefined): string {
  if (!seconds) return '—';
  return new Date(seconds * 1000).toLocaleString('pt-BR');
}

function freshnessOf(seconds: number | undefined): 'fresh' | 'stale' | 'cold' | 'unknown' {
  if (!seconds) return 'unknown';
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - seconds);
  if (diff < 60) return 'fresh';
  if (diff < 180) return 'stale';
  return 'cold';
}

const FRESHNESS_VISUAL: Record<
  'fresh' | 'stale' | 'cold' | 'unknown',
  { dot: string; ring: string; text: string; pulse: boolean; label: string }
> = {
  fresh: {
    dot: 'bg-green-500',
    ring: 'ring-green-200',
    text: 'text-green-800',
    pulse: true,
    label: 'Worker ativo',
  },
  stale: {
    dot: 'bg-amber-500',
    ring: 'ring-amber-200',
    text: 'text-amber-800',
    pulse: false,
    label: 'Sinal fraco',
  },
  cold: {
    dot: 'bg-red-500',
    ring: 'ring-red-200',
    text: 'text-red-700',
    pulse: false,
    label: 'Worker inativo',
  },
  unknown: {
    dot: 'bg-zinc-400',
    ring: 'ring-zinc-200',
    text: 'text-zinc-600',
    pulse: false,
    label: 'Sem registro',
  },
};

/* ------------------------------------------------------------------ */
/* QR ceremony pieces                                                 */
/* ------------------------------------------------------------------ */

/**
 * Pairing-screen centerpiece. Frame around the QR with corner brackets,
 * concentric pulse rings in WhatsApp green, and a ring-shaped TTL countdown
 * that decays as the QR approaches expiry.
 */
function QrCeremony({ status }: { status: WhatsAppStatus }) {
  // Re-render every second so the TTL ring animates smoothly.
  useTick(1000);

  const qrExpiresSeconds = status.qrExpiresAt?.seconds;
  const qrTtlSeconds = qrExpiresSeconds
    ? Math.max(0, qrExpiresSeconds - Math.floor(Date.now() / 1000))
    : null;

  // For the ring, we assume each QR has a 30s lifecycle (the worker rotates
  // them on that cadence). We clamp the percentage between 4% and 100% so the
  // arc never disappears entirely.
  const TTL_BASE_SECONDS = 30;
  const ttlPct =
    qrTtlSeconds === null
      ? 100
      : Math.min(100, Math.max(4, (qrTtlSeconds / TTL_BASE_SECONDS) * 100));

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        {/* Outermost soft halo — WhatsApp green tinted with cream */}
        <div
          aria-hidden="true"
          className="absolute -inset-6 rounded-[2.25rem] bg-gradient-to-br from-green-100/70 via-amber-50/40 to-green-50/60 blur-2xl"
        />

        {/* Concentric pulse rings while waiting for scan */}
        <span
          aria-hidden="true"
          className="absolute inset-0 -m-3 rounded-[1.75rem] ring-2 ring-green-300/40 animate-ping"
          style={{ animationDuration: '2.6s' }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 -m-1 rounded-[1.5rem] ring-2 ring-green-400/30 animate-ping"
          style={{ animationDuration: '2.6s', animationDelay: '0.6s' }}
        />

        {/* Frame with corner brackets */}
        <div
          className="relative rounded-[1.5rem] border border-border bg-white p-5 shadow-[0_18px_48px_-22px_rgba(45,35,25,0.35)]"
          data-testid="qr-frame"
        >
          {/* Corner brackets — gold to match Momento Cake */}
          <CornerBrackets />

          {/* QR or skeleton */}
          {status.qr ? (
            <img
              src={status.qr}
              alt="QR de pareamento do WhatsApp"
              className="h-72 w-72 rounded-md bg-white animate-fade-in sm:h-80 sm:w-80"
              key={status.qr.slice(0, 32)}
            />
          ) : (
            <div className="flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
              <Skeleton className="h-full w-full" />
            </div>
          )}

          {/* WhatsApp brand crest tucked into one corner of the frame */}
          <div className="pointer-events-none absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-green-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-green-700 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            WhatsApp Business
          </div>
        </div>

        {/* TTL ring — wraps the frame, decays as QR approaches expiry */}
        {qrTtlSeconds !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-2 rounded-[1.75rem]"
            style={{
              background: `conic-gradient(rgba(34,197,94,0.55) ${ttlPct}%, rgba(221,213,201,0.35) ${ttlPct}%)`,
              WebkitMask:
                'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
            }}
          />
        )}
      </div>

      {/* TTL label */}
      {qrTtlSeconds !== null && (
        <p
          data-testid="qr-ttl"
          className={cn(
            'text-xs font-medium tracking-wide text-muted-foreground',
            qrTtlSeconds <= 5 && 'text-amber-700'
          )}
        >
          {qrTtlSeconds > 0
            ? `Atualiza em ${qrTtlSeconds}s`
            : 'Atualizando QR…'}
        </p>
      )}
    </div>
  );
}

function CornerBrackets() {
  // Four absolutely-positioned brackets in Momento Cake gold.
  const base =
    "absolute h-5 w-5 border-[var(--secondary)]";
  return (
    <>
      <span aria-hidden="true" className={cn(base, '-left-px -top-px border-l-2 border-t-2 rounded-tl-lg')} />
      <span aria-hidden="true" className={cn(base, '-right-px -top-px border-r-2 border-t-2 rounded-tr-lg')} />
      <span aria-hidden="true" className={cn(base, '-left-px -bottom-px border-l-2 border-b-2 rounded-bl-lg')} />
      <span aria-hidden="true" className={cn(base, '-right-px -bottom-px border-r-2 border-b-2 rounded-br-lg')} />
    </>
  );
}

function PairingInstructions() {
  const steps = [
    'Abra o WhatsApp Business no seu celular.',
    'Toque em Mais opções (⋮) e depois em "Aparelhos conectados".',
    'Toque em "Conectar um aparelho".',
    'Aponte a câmera para o QR ao lado.',
  ];
  return (
    <ol
      className="grid gap-3 text-sm sm:gap-2.5"
      data-testid="pairing-steps"
    >
      {steps.map((step, idx) => (
        <li
          key={idx}
          className="flex items-start gap-3 rounded-xl border border-border/60 bg-white/60 px-3 py-2.5 backdrop-blur-sm animate-fade-in-up"
          style={{ animationDelay: `${idx * 80}ms` }}
        >
          <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--secondary)] text-xs font-bold text-[var(--secondary-foreground)] shadow-sm">
            {idx + 1}
          </span>
          <span className="leading-relaxed text-foreground/90">{step}</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function WhatsAppSettingsPage() {
  useTick(5000);
  const { status, isLoading, error } = useWhatsAppStatus();

  const heartbeatSeconds = status?.lastHeartbeatAt?.seconds;
  const freshness = freshnessOf(heartbeatSeconds);
  const freshnessVisual = FRESHNESS_VISUAL[freshness];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Integração
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">WhatsApp Business</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conexão e pareamento da instância. A inbox aparece após o aparelho ficar online.
          </p>
        </div>
        <WhatsAppStatusBadge />
      </header>

      {/* Loading skeleton */}
      {isLoading && (
        <Card data-testid="settings-loading" className="overflow-hidden">
          <CardContent className="flex flex-col items-center gap-5 py-14">
            <Skeleton className="h-72 w-72 rounded-2xl" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardContent>
        </Card>
      )}

      {/* Read error */}
      {error && (
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="flex items-start gap-3 py-5 text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Não foi possível ler o status</p>
              <Collapsible>
                <CollapsibleTrigger className="inline-flex items-center gap-1 text-xs text-red-700 underline-offset-2 hover:underline">
                  Detalhes <ChevronDown className="h-3 w-3" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 rounded-md bg-red-100/60 px-2 py-1.5 font-mono text-[11px] text-red-900">
                  {error.message}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && status && (
        <>
          {/* ─── PAIRING ─── */}
          {status.state === 'pairing' && (
            <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-[var(--background)] via-white to-[var(--muted)]/40">
              <CardContent className="grid gap-8 px-6 py-10 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-14 lg:px-12">
                {/* Left: QR ceremony */}
                <div className="flex justify-center lg:justify-start">
                  <QrCeremony status={status} />
                </div>

                {/* Right: instructions */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-[var(--primary)]" />
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                      Como parear
                    </p>
                  </div>
                  <h2 className="text-2xl font-semibold leading-tight">
                    Escaneie o QR com seu WhatsApp Business
                  </h2>
                  <p className="max-w-md text-sm text-muted-foreground">
                    O QR é regerado automaticamente a cada 30 segundos por segurança. Aproxime
                    o celular do monitor para escanear.
                  </p>
                  <PairingInstructions />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── CONNECTING ─── */}
          {status.state === 'connecting' && (
            <Card className="overflow-hidden">
              <CardContent className="flex flex-col items-center gap-5 py-16 animate-fade-in">
                <div className="relative flex h-16 w-16 items-center justify-center">
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 animate-ping rounded-full bg-green-400/40"
                    style={{ animationDuration: '1.6s' }}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-2 rounded-full bg-green-500/15"
                  />
                  <Loader2 className="relative h-8 w-8 animate-spin text-green-600" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold">Conectando ao WhatsApp…</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sincronizando histórico recente. Não feche esta janela.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── CONNECTED ─── */}
          {status.state === 'connected' && (
            <Card className="overflow-hidden border-green-200 bg-gradient-to-br from-green-50/50 via-white to-[var(--background)]">
              <CardContent className="flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:gap-8 sm:px-10">
                <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center">
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-green-200/60 animate-pulse"
                  />
                  <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-green-500 shadow-[0_8px_24px_-8px_rgba(34,197,94,0.6)]">
                    <CheckCircle2 className="h-9 w-9 text-white animate-celebrate-check" />
                  </span>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">
                    Pareado
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight">Tudo certo</h2>
                  {status.pairedPhone && (
                    <p className="text-sm text-foreground/80">
                      Número conectado:{' '}
                      <strong className="font-mono text-foreground">
                        {formatPhoneForDisplay(status.pairedPhone)}
                      </strong>
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Volte para a inbox para conversar com seus clientes.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── DISCONNECTED ─── */}
          {status.state === 'disconnected' && (
            <Card className="overflow-hidden border-red-200 bg-gradient-to-br from-red-50/40 via-white to-[var(--background)]">
              <CardContent className="space-y-4 px-6 py-8 sm:px-10">
                <div className="flex items-start gap-4">
                  <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
                      Desconectado
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">
                      O WhatsApp foi desconectado
                    </h2>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="relative inline-flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                      </span>
                      Tentando reconectar automaticamente…
                    </p>
                  </div>
                </div>

                {status.lastError && (
                  <Collapsible>
                    <CollapsibleTrigger className="inline-flex items-center gap-1 text-xs text-red-700 underline-offset-2 hover:underline">
                      Ver detalhes técnicos <ChevronDown className="h-3 w-3" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 rounded-md border border-red-200 bg-red-50/60 px-3 py-2 font-mono text-[11px] text-red-900">
                      {status.lastError}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          )}

          {/* ─── Worker activity strip ─── */}
          <Card className="overflow-hidden">
            <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 text-xs">
              <div className="flex items-center gap-2">
                <QrCode className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                  Worker
                </span>
              </div>
              <div
                className={cn(
                  'inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 ring-1 ring-inset',
                  freshnessVisual.ring,
                  freshnessVisual.text
                )}
                title={absoluteTime(heartbeatSeconds)}
              >
                <span className="relative inline-flex h-2 w-2">
                  {freshnessVisual.pulse && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute inline-flex h-full w-full animate-ping rounded-full opacity-70',
                        freshnessVisual.dot
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      'relative inline-flex h-2 w-2 rounded-full',
                      freshnessVisual.dot
                    )}
                  />
                </span>
                <span className="font-medium">{freshnessVisual.label}</span>
                <span className="opacity-70">· {relativeSeconds(heartbeatSeconds)}</span>
              </div>
              <span className="ml-auto text-muted-foreground">
                {absoluteTime(heartbeatSeconds)}
              </span>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
