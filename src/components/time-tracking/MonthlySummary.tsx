'use client';

import { useMemo } from 'react';
import {
  Clock,
  Sun,
  Moon,
  AlertTriangle,
  Calendar,
  CalendarCheck,
  CalendarX,
  CalendarMinus,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TimeEntry } from '@/types/time-tracking';

interface MonthlySummaryProps {
  entries: TimeEntry[];
  loading: boolean;
}

function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

interface SummaryMetric {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}

export function MonthlySummary({ entries, loading }: MonthlySummaryProps) {
  const summary = useMemo(() => {
    let totalWorkedMinutes = 0;
    let regularMinutes = 0;
    let overtimeMinutes = 0;
    let nightMinutes = 0;
    let restDayMinutes = 0;
    let daysWorked = 0;
    let daysAbsent = 0;
    let justifiedAbsences = 0;
    let unjustifiedAbsences = 0;
    let daysComplete = 0;

    for (const entry of entries) {
      totalWorkedMinutes += entry.summary.totalWorkedMinutes;
      regularMinutes += entry.summary.regularMinutes;
      overtimeMinutes += entry.summary.overtimeMinutes;
      nightMinutes += entry.summary.nightMinutes;

      if (entry.summary.isRestDay || entry.summary.isHoliday) {
        restDayMinutes += entry.summary.totalWorkedMinutes;
      }

      if (entry.summary.status === 'complete') {
        daysComplete++;
        daysWorked++;
      } else if (entry.summary.status === 'incomplete') {
        daysWorked++;
      } else if (entry.summary.status === 'absent') {
        daysAbsent++;
        unjustifiedAbsences++;
      } else if (entry.summary.status === 'justified_absence') {
        daysAbsent++;
        justifiedAbsences++;
      }
    }

    return {
      totalWorkedMinutes,
      regularMinutes,
      overtimeMinutes,
      nightMinutes,
      restDayMinutes,
      daysWorked,
      daysAbsent,
      justifiedAbsences,
      unjustifiedAbsences,
      daysComplete,
    };
  }, [entries]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando resumo...
        </CardContent>
      </Card>
    );
  }

  const metrics: SummaryMetric[] = [
    {
      label: 'Dias Trabalhados',
      value: summary.daysWorked,
      icon: <CalendarCheck className="h-5 w-5 text-green-600" />,
    },
    {
      label: 'Total Trabalhado',
      value: formatMinutesToHours(summary.totalWorkedMinutes),
      icon: <Clock className="h-5 w-5 text-amber-700" />,
    },
    {
      label: 'Horas Regulares',
      value: formatMinutesToHours(summary.regularMinutes),
      icon: <Sun className="h-5 w-5 text-amber-500" />,
    },
    {
      label: 'Horas Extras',
      value: formatMinutesToHours(summary.overtimeMinutes),
      icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
      badge:
        summary.overtimeMinutes > 0 ? (
          <Badge variant="warning" className="text-[10px]">
            55%
          </Badge>
        ) : undefined,
    },
    {
      label: 'Horas Noturnas',
      value: formatMinutesToHours(summary.nightMinutes),
      icon: <Moon className="h-5 w-5 text-indigo-500" />,
      badge:
        summary.nightMinutes > 0 ? (
          <Badge variant="info" className="text-[10px]">
            37%
          </Badge>
        ) : undefined,
    },
    {
      label: 'Horas Descanso/Feriado',
      value: formatMinutesToHours(summary.restDayMinutes),
      icon: <Calendar className="h-5 w-5 text-blue-500" />,
      badge:
        summary.restDayMinutes > 0 ? (
          <Badge variant="info" className="text-[10px]">
            100%
          </Badge>
        ) : undefined,
    },
    {
      label: 'Faltas Justificadas',
      value: summary.justifiedAbsences,
      icon: <CalendarMinus className="h-5 w-5 text-blue-500" />,
    },
    {
      label: 'Faltas Injustificadas',
      value: summary.unjustifiedAbsences,
      icon: <CalendarX className="h-5 w-5 text-red-500" />,
      badge:
        summary.unjustifiedAbsences > 0 ? (
          <Badge variant="destructive" className="text-[10px]">
            Perde DSR
          </Badge>
        ) : undefined,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-amber-700" />
          Resumo Mensal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-1 rounded-md border p-3">
              <div className="flex items-center gap-2">
                {metric.icon}
                <span className="text-xs text-muted-foreground">{metric.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{metric.value}</span>
                {metric.badge}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
