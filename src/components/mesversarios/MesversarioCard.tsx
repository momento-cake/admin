'use client';

import Link from 'next/link';
import { Baby } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MesStatusBadge } from '@/components/mesversarios/MesStatusBadge';
import type { Mesversario } from '@/types/mesversario';
import {
  getMesversarioProgress,
  getNextDueMes,
  getMesLabel,
  daysUntil,
} from '@/lib/mesversario-utils';
import { getRelativeDateLabel, formatDisplayDate } from '@/lib/special-dates-utils';

interface MesversarioCardProps {
  mesversario: Mesversario;
}

/**
 * Summary card for one baby's mesversário journey: name, X/12 progress, and
 * the next-due month with its relative date.
 */
export function MesversarioCard({ mesversario }: MesversarioCardProps) {
  const { done, total } = getMesversarioProgress(mesversario);
  const next = getNextDueMes(mesversario);
  const percent = Math.round((done / total) * 100);

  const nextYear = next ? Number(next.dataComemoracao.split('-')[0]) : null;

  return (
    <Link href={`/orders/mesversarios/${mesversario.id}`} className="block">
      <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Baby className="h-4 w-4 text-muted-foreground" aria-hidden />
            {mesversario.bebeNome}
          </CardTitle>
          <span className="text-xs text-muted-foreground">{mesversario.clienteNome}</span>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span>
                {done}/{total} meses
              </span>
            </div>
            <Progress value={percent} className="h-2" />
          </div>

          {next ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{getMesLabel(next.numero)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {nextYear ? formatDisplayDate(next.dataComemoracao, nextYear) : next.dataComemoracao}
                  {' · '}
                  {getRelativeDateLabel(daysUntil(next.dataComemoracao))}
                </p>
              </div>
              <MesStatusBadge status={next.status} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Jornada concluída 🎉</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
