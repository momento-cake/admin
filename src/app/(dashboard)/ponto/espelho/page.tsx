'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ClipboardList, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { useTimeEntries } from '@/hooks/useTimeTracking';
import { DayView } from '@/components/time-tracking/DayView';
import { WeekView } from '@/components/time-tracking/WeekView';
import { MonthView } from '@/components/time-tracking/MonthView';
import { MonthlySummary } from '@/components/time-tracking/MonthlySummary';
import { PayrollBreakdown } from '@/components/time-tracking/PayrollBreakdown';
import { ExportModal } from '@/components/time-tracking/ExportModal';
import { Button } from '@/components/ui/button';

export default function EspelhoPage() {
  const { canAccess, loading: permLoading } = usePermissions();
  const [activeTab, setActiveTab] = useState('mes');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Calculate date range based on active tab to fetch the right entries
  const dateRange = useMemo(() => {
    if (activeTab === 'dia') {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      return { startDate: dateStr, endDate: dateStr };
    }
    if (activeTab === 'semana') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return {
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(weekEnd, 'yyyy-MM-dd'),
      };
    }
    // mes (month) - default
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    return {
      startDate: format(monthStart, 'yyyy-MM-dd'),
      endDate: format(monthEnd, 'yyyy-MM-dd'),
    };
  }, [activeTab, selectedDate]);

  const { entries, loading: entriesLoading } = useTimeEntries({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  if (permLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!canAccess('time_tracking')) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">
          Voce nao tem permissao para acessar o controle de ponto.
        </p>
      </div>
    );
  }

  const handleDayClickFromMonth = (date: Date) => {
    setSelectedDate(date);
    setActiveTab('dia');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-momento-text sm:text-3xl">
            <ClipboardList className="h-7 w-7 text-amber-700" />
            Meu Espelho de Ponto
          </h1>
          <p className="text-muted-foreground">
            Consulte seus registros de ponto por dia, semana ou mes
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExportModalOpen(true)}
          className="cursor-pointer"
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dia">Dia</TabsTrigger>
          <TabsTrigger value="semana">Semana</TabsTrigger>
          <TabsTrigger value="mes">Mes</TabsTrigger>
        </TabsList>

        <TabsContent value="dia">
          <DayView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            entries={entries}
            loading={entriesLoading}
          />
        </TabsContent>

        <TabsContent value="semana">
          <WeekView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            entries={entries}
            loading={entriesLoading}
          />
        </TabsContent>

        <TabsContent value="mes">
          <div className="space-y-6">
            <MonthView
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              entries={entries}
              loading={entriesLoading}
              onDayClick={handleDayClickFromMonth}
            />
            <MonthlySummary entries={entries} loading={entriesLoading} />
            <PayrollBreakdown payroll={null} loading={entriesLoading} />
          </div>
        </TabsContent>
      </Tabs>

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
}
