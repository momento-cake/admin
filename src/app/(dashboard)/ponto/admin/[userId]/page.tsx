'use client';

import { useState, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { useTimeEntries } from '@/hooks/useTimeTracking';
import { useTimeTrackingAdmin } from '@/hooks/useTimeTrackingAdmin';
import { DayView } from '@/components/time-tracking/DayView';
import { WeekView } from '@/components/time-tracking/WeekView';
import { MonthView } from '@/components/time-tracking/MonthView';
import { MonthlySummary } from '@/components/time-tracking/MonthlySummary';
import { AdminEditPanel } from '@/components/time-tracking/admin/AdminEditPanel';
import { TimeMarking } from '@/types/time-tracking';
import { ArrowLeft, User, Shield } from 'lucide-react';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default function EmployeeDetailPage({ params }: PageProps) {
  const { userId } = use(params);
  const router = useRouter();
  const { isAdmin, loading: permLoading } = usePermissions();
  const { updateEntry, justifyAbsence } = useTimeTrackingAdmin();
  const [activeTab, setActiveTab] = useState('mes');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Calculate date range based on active tab
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
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    return {
      startDate: format(monthStart, 'yyyy-MM-dd'),
      endDate: format(monthEnd, 'yyyy-MM-dd'),
    };
  }, [activeTab, selectedDate]);

  const { entries, loading: entriesLoading, refetch } = useTimeEntries({
    userId,
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

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">
          Apenas administradores podem acessar esta pagina.
        </p>
      </div>
    );
  }

  // Find the entry for the selected day (for admin edit panel)
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedEntry = entries.find((e) => e.date === selectedDateStr);

  const handleUpdateMarkings = async (
    entryId: string,
    markings: TimeMarking[],
    reason: string
  ) => {
    await updateEntry(entryId, markings, reason);
    await refetch();
  };

  const handleJustifyAbsence = async (
    entryId: string,
    status: 'justified_absence' | 'absent',
    reason: string
  ) => {
    await justifyAbsence(entryId, status, reason);
    await refetch();
  };

  const handleDayClickFromMonth = (date: Date) => {
    setSelectedDate(date);
    setActiveTab('dia');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/ponto/admin')}
          className="cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-momento-text sm:text-3xl">
            <User className="h-7 w-7 text-amber-700" />
            Espelho de Ponto
          </h1>
          <p className="text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Visualizacao administrativa - {userId}
          </p>
        </div>
      </div>

      {/* Calendar Tabs (reusing espelho views) */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dia">Dia</TabsTrigger>
          <TabsTrigger value="semana">Semana</TabsTrigger>
          <TabsTrigger value="mes">Mes</TabsTrigger>
        </TabsList>

        <TabsContent value="dia">
          <div className="grid gap-6 lg:grid-cols-2">
            <DayView
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              entries={entries}
              loading={entriesLoading}
            />
            {selectedEntry && (
              <AdminEditPanel
                entry={selectedEntry}
                onUpdateMarkings={handleUpdateMarkings}
                onJustifyAbsence={handleJustifyAbsence}
              />
            )}
          </div>
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
