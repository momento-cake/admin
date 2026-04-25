'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WhatsAppStatusBadge } from '@/components/whatsapp/WhatsAppStatusBadge';
import { useWhatsAppStatus } from '@/hooks/useWhatsAppStatus';
import { formatPhoneForDisplay } from '@/lib/phone';

function useTick(intervalMs: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

function relativeSeconds(seconds: number | undefined): string {
  if (!seconds) return '—';
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - seconds);
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)}m`;
  return `há ${Math.floor(diff / 3600)}h`;
}

function absoluteTime(seconds: number | undefined): string {
  if (!seconds) return '—';
  return new Date(seconds * 1000).toLocaleString('pt-BR');
}

export default function WhatsAppSettingsPage() {
  useTick(5000);
  const { status, isLoading, error } = useWhatsAppStatus();

  const heartbeatSeconds = status?.lastHeartbeatAt?.seconds;
  const qrExpiresSeconds = status?.qrExpiresAt?.seconds;
  const qrTtlSeconds = qrExpiresSeconds
    ? Math.max(0, qrExpiresSeconds - Math.floor(Date.now() / 1000))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp</h1>
          <p className="text-muted-foreground">Conexão e pareamento da instância.</p>
        </div>
        <WhatsAppStatusBadge />
      </div>

      {isLoading && (
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-sm text-muted-foreground">Carregando status…</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">Erro ao ler status: {error.message}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && status && (
        <>
          {status.state === 'pairing' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" /> Escaneie com seu WhatsApp Business
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 py-8">
                {status.qr ? (
                  <img
                    src={status.qr}
                    alt="QR de pareamento"
                    className="h-64 w-64 rounded-md border bg-white p-2"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">QR ainda não disponível…</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Abra o WhatsApp no celular &gt; Menu &gt; Aparelhos conectados &gt; Conectar um aparelho.
                </p>
                {qrTtlSeconds !== null && (
                  <p className="text-xs text-muted-foreground">
                    Expira em {qrTtlSeconds}s
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {status.state === 'connecting' && (
            <Card>
              <CardContent className="flex items-center gap-3 py-6">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="text-sm">Conectando ao WhatsApp…</p>
              </CardContent>
            </Card>
          )}

          {status.state === 'connected' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" /> Conectado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 py-4 text-sm">
                {status.pairedPhone && (
                  <p>
                    Número pareado: <strong>{formatPhoneForDisplay(status.pairedPhone)}</strong>
                  </p>
                )}
                <p className="text-muted-foreground">
                  Tudo certo. Volte para a inbox para conversar.
                </p>
                {/* TODO: ações Reconectar / Desconectar (out of MVP scope) */}
              </CardContent>
            </Card>
          )}

          {status.state === 'disconnected' && (
            <Card>
              <CardContent className="space-y-2 py-6">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" /> Desconectado
                </div>
                {status.lastError && (
                  <p className="text-sm text-red-700">Último erro: {status.lastError}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Aguardando worker reconectar…
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Atividade do worker</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help underline-offset-2 hover:underline">
                      Última atividade: {relativeSeconds(heartbeatSeconds)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{absoluteTime(heartbeatSeconds)}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
