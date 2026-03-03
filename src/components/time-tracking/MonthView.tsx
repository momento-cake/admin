'use client';

import { useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  getDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TimeEntry, TimeEntryStatus } from '@/types/time-tracking';

interface MonthViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  entries: TimeEntry[];
  loading: boolean;
  onDayClick?: (date: Date) => void;
}

const STATUS_BG: Record<TimeEntryStatus, string> = {
  complete: 'bg-green-50 border-green-200',
  incomplete: 'bg-yellow-50 border-yellow-200',
  absent: 'bg-red-50 border-red-200',
  justified_absence: 'bg-blue-50 border-blue-200',
  day_off: 'bg-gray-50 border-gray-200',
};

const STATUS_TEXT: Record<TimeEntryStatus, string> = {
  complete: 'text-green-700',
  incomplete: 'text-yellow-700',
  absent: 'text-red-700',
  justified_absence: 'text-blue-700',
  day_off: 'text-gray-500',
};

function formatMinutesShort(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export function MonthView({ selectedDate, onDateChange, entries, loading, onDayClick }: MonthViewProps) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const entryMap = useMemo(() => {
    const map = new Map<string, TimeEntry>();
    for (const entry of entries) {
      map.set(entry.date, entry);
    }
    return map;
  }, [entries]);

  const handlePrevMonth = () => onDateChange(subMonths(selectedDate, 1));
  const handleNextMonth = () => onDateChange(addMonths(selectedDate, 1));

  const weekDayHeaders = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-lg font-semibold capitalize">
            {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
        </div>
        <Button variant="outline" size="icon" onClick={handleNextMonth}>
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
          <CardContent className="p-2 sm:p-4">
            {/* Day-of-week headers */}
            <div className="mb-1 grid grid-cols-7 gap-1">
              {weekDayHeaders.map((label) => (
                <div
                  key={label}
                  className="py-1 text-center text-xs font-semibold uppercase text-muted-foreground"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const entry = entryMap.get(dateStr);
                const inMonth = isSameMonth(day, selectedDate);
                const today = isToday(day);
                const dayOfWeek = getDay(day);
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                const status = entry?.summary.status;
                const bgClass = status ? STATUS_BG[status] : '';
                const textClass = status ? STATUS_TEXT[status] : '';

                return (
                  <button
                    key={dateStr}
                    type="button"
                    className={`
                      relative flex min-h-[60px] flex-col items-center rounded-md border p-1 text-center transition-colors
                      ${inMonth ? '' : 'opacity-30'}
                      ${today ? 'ring-2 ring-amber-600 ring-offset-1' : ''}
                      ${isWeekend && !status ? 'bg-gray-50/50 border-gray-100' : ''}
                      ${bgClass || 'border-transparent'}
                      ${onDayClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                    `}
                    onClick={() => onDayClick?.(day)}
                    disabled={!onDayClick}
                  >
                    <span
                      className={`text-xs font-medium ${
                        today ? 'text-amber-700 font-bold' : inMonth ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>

                    {entry && inMonth && (
                      <>
                        <span className={`mt-0.5 text-xs font-semibold ${textClass}`}>
                          {formatMinutesShort(entry.summary.totalWorkedMinutes)}
                        </span>
                        {entry.summary.overtimeMinutes > 0 && (
                          <Badge
                            variant="warning"
                            className="mt-0.5 px-1 py-0 text-[10px] leading-tight"
                          >
                            +{formatMinutesShort(entry.summary.overtimeMinutes)}
                          </Badge>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Color Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Legenda:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-green-200 bg-green-50" /> Completo
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-yellow-200 bg-yellow-50" /> Incompleto
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-red-200 bg-red-50" /> Ausente
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-gray-200 bg-gray-50" /> Folga
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-blue-200 bg-blue-50" /> Feriado/Justificada
        </span>
      </div>
    </div>
  );
}
