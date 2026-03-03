'use client';

import { useMemo } from 'react';
import {
  format,
  addDays,
  subDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Coffee,
  LogIn,
  LogOut,
  Sun,
  Moon,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimeEntry, MarkingType, TimeEntryAuditLog } from '@/types/time-tracking';

interface DayViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  entries: TimeEntry[];
  loading: boolean;
}

const MARKING_LABELS: Record<MarkingType, string> = {
  clock_in: 'Entrada',
  lunch_out: 'Saida Almoco',
  lunch_in: 'Retorno Almoco',
  clock_out: 'Saida',
};

const MARKING_ICONS: Record<MarkingType, React.ReactNode> = {
  clock_in: <LogIn className="h-4 w-4 text-green-600" />,
  lunch_out: <Coffee className="h-4 w-4 text-amber-600" />,
  lunch_in: <Coffee className="h-4 w-4 text-blue-600" />,
  clock_out: <LogOut className="h-4 w-4 text-red-600" />,
};

function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'complete':
      return <Badge variant="success">Completo</Badge>;
    case 'incomplete':
      return <Badge variant="warning">Incompleto</Badge>;
    case 'absent':
      return <Badge variant="destructive">Ausente</Badge>;
    case 'justified_absence':
      return <Badge variant="info">Falta Justificada</Badge>;
    case 'day_off':
      return <Badge variant="secondary">Folga</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function DayView({ selectedDate, onDateChange, entries, loading }: DayViewProps) {
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const entry = useMemo(() => entries.find((e) => e.date === dateStr) ?? null, [entries, dateStr]);

  const handlePrevDay = () => onDateChange(subDays(selectedDate, 1));
  const handleNextDay = () => onDateChange(addDays(selectedDate, 1));

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={handlePrevDay}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-lg font-semibold">
            {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
        <Button variant="outline" size="icon" onClick={handleNextDay}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Carregando...
          </CardContent>
        </Card>
      ) : !entry ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p>Nenhum registro de ponto para este dia.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Markings Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Marcacoes do Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-0">
                {entry.markings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma marcacao registrada.</p>
                ) : (
                  <div className="space-y-3">
                    {entry.markings
                      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                      .map((marking, idx) => (
                        <div
                          key={marking.id}
                          className="flex items-center gap-3 rounded-md border p-3"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            {MARKING_ICONS[marking.type]}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{MARKING_LABELS[marking.type]}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(marking.timestamp), 'HH:mm:ss')}
                            </p>
                          </div>
                          {marking.source === 'manual' && (
                            <Badge variant="outline" className="text-xs">
                              Manual
                            </Badge>
                          )}
                          {marking.geolocation && (
                            <Badge variant="secondary" className="text-xs">
                              GPS
                            </Badge>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo do Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total Trabalhado</p>
                  <p className="text-lg font-semibold">
                    <Clock className="mr-1 inline h-4 w-4 text-amber-700" />
                    {formatMinutesToHours(entry.summary.totalWorkedMinutes)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Horas Regulares</p>
                  <p className="text-lg font-semibold">
                    <Sun className="mr-1 inline h-4 w-4 text-amber-500" />
                    {formatMinutesToHours(entry.summary.regularMinutes)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Horas Extras</p>
                  <p className="text-lg font-semibold">
                    <AlertTriangle className="mr-1 inline h-4 w-4 text-orange-500" />
                    {formatMinutesToHours(entry.summary.overtimeMinutes)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Horas Noturnas</p>
                  <p className="text-lg font-semibold">
                    <Moon className="mr-1 inline h-4 w-4 text-indigo-500" />
                    {formatMinutesToHours(entry.summary.nightMinutes)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Intervalo</p>
                  <p className="text-lg font-semibold">
                    <Coffee className="mr-1 inline h-4 w-4 text-amber-700" />
                    {formatMinutesToHours(entry.summary.totalBreakMinutes)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="pt-1">{getStatusBadge(entry.summary.status)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
