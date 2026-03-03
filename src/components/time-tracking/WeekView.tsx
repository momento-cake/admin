'use client';

import { useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { TimeEntry, MarkingType, TimeEntryStatus } from '@/types/time-tracking';

interface WeekViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  entries: TimeEntry[];
  loading: boolean;
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

const STATUS_COLORS: Record<TimeEntryStatus | 'none', string> = {
  complete: 'bg-green-500',
  incomplete: 'bg-yellow-500',
  absent: 'bg-red-500',
  justified_absence: 'bg-blue-500',
  day_off: 'bg-gray-400',
  none: 'bg-gray-200',
};

function formatMinutes(minutes: number): string {
  if (minutes === 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function getMarkingTime(entry: TimeEntry | undefined, type: MarkingType): string {
  if (!entry) return '-';
  const marking = entry.markings.find((m) => m.type === type);
  if (!marking) return '-';
  return format(new Date(marking.timestamp), 'HH:mm');
}

export function WeekView({ selectedDate, onDateChange, entries, loading }: WeekViewProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const entryMap = useMemo(() => {
    const map = new Map<string, TimeEntry>();
    for (const entry of entries) {
      map.set(entry.date, entry);
    }
    return map;
  }, [entries]);

  const weeklyTotals = useMemo(() => {
    let totalWorked = 0;
    let totalOvertime = 0;
    let totalNight = 0;
    for (const day of weekDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const entry = entryMap.get(dateStr);
      if (entry) {
        totalWorked += entry.summary.totalWorkedMinutes;
        totalOvertime += entry.summary.overtimeMinutes;
        totalNight += entry.summary.nightMinutes;
      }
    }
    return { totalWorked, totalOvertime, totalNight };
  }, [weekDays, entryMap]);

  const handlePrevWeek = () => onDateChange(subWeeks(selectedDate, 1));
  const handleNextWeek = () => onDateChange(addWeeks(selectedDate, 1));

  const rows: { label: string; getValue: (entry: TimeEntry | undefined) => string }[] = [
    { label: 'Entrada', getValue: (e) => getMarkingTime(e, 'clock_in') },
    { label: 'Saida Almoco', getValue: (e) => getMarkingTime(e, 'lunch_out') },
    { label: 'Retorno Almoco', getValue: (e) => getMarkingTime(e, 'lunch_in') },
    { label: 'Saida', getValue: (e) => getMarkingTime(e, 'clock_out') },
    { label: 'Total', getValue: (e) => (e ? formatMinutes(e.summary.totalWorkedMinutes) : '-') },
  ];

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={handlePrevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-lg font-semibold">
            {format(weekStart, "dd 'de' MMM", { locale: ptBR })} -{' '}
            {format(weekEnd, "dd 'de' MMM yyyy", { locale: ptBR })}
          </span>
        </div>
        <Button variant="outline" size="icon" onClick={handleNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Carregando...
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Marcacao</TableHead>
                  {weekDays.map((day, idx) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const entry = entryMap.get(dateStr);
                    const status = entry?.summary.status ?? 'none';
                    return (
                      <TableHead key={idx} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span>{DAY_LABELS[idx]}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {format(day, 'dd/MM')}
                          </span>
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[status]}`}
                            title={status}
                          />
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    {weekDays.map((day, idx) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const entry = entryMap.get(dateStr);
                      return (
                        <TableCell key={idx} className="text-center text-sm">
                          {row.getValue(entry)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Semanal</TableCell>
                  <TableCell colSpan={7} className="text-center">
                    <div className="flex items-center justify-center gap-6 text-sm">
                      <span>
                        Total: <strong>{formatMinutes(weeklyTotals.totalWorked)}</strong>
                      </span>
                      {weeklyTotals.totalOvertime > 0 && (
                        <span className="text-orange-600">
                          Extras: <strong>{formatMinutes(weeklyTotals.totalOvertime)}</strong>
                        </span>
                      )}
                      {weeklyTotals.totalNight > 0 && (
                        <span className="text-indigo-600">
                          Noturnas: <strong>{formatMinutes(weeklyTotals.totalNight)}</strong>
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Legenda:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Completo
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" /> Incompleto
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Ausente
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-gray-400" /> Folga
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> Feriado/Justificada
        </span>
      </div>
    </div>
  );
}
