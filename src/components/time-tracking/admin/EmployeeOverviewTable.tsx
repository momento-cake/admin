'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeStatus } from '@/hooks/useTimeTrackingAdmin';
import { MarkingType } from '@/types/time-tracking';
import { Eye, Pencil, Search } from 'lucide-react';
import { format } from 'date-fns';

interface EmployeeOverviewTableProps {
  employees: EmployeeStatus[];
  loading: boolean;
  onEditEntry?: (employee: EmployeeStatus) => void;
}

const STATUS_BADGES: Record<
  EmployeeStatus['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  complete: { label: 'Completo', variant: 'default' },
  on_time: { label: 'No Horario', variant: 'secondary' },
  on_lunch: { label: 'No Almoco', variant: 'outline' },
  not_clocked_out: { label: 'Sem Saida', variant: 'secondary' },
  late: { label: 'Atrasado', variant: 'destructive' },
  absent: { label: 'Ausente', variant: 'destructive' },
};

function getMarkingTime(
  employee: EmployeeStatus,
  type: MarkingType
): string {
  if (!employee.entry) return '—';
  const marking = employee.entry.markings.find((m) => m.type === type);
  if (!marking) return '—';
  const ts =
    marking.timestamp instanceof Date
      ? marking.timestamp
      : new Date(marking.timestamp as any);
  return format(ts, 'HH:mm');
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export function EmployeeOverviewTable({
  employees,
  loading,
  onEditEntry,
}: EmployeeOverviewTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = employees.filter((emp) => {
    const matchesSearch =
      !search ||
      emp.displayName.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar funcionario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] cursor-pointer">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">Todos</SelectItem>
            <SelectItem value="complete" className="cursor-pointer">Completo</SelectItem>
            <SelectItem value="on_time" className="cursor-pointer">No Horario</SelectItem>
            <SelectItem value="on_lunch" className="cursor-pointer">No Almoco</SelectItem>
            <SelectItem value="not_clocked_out" className="cursor-pointer">Sem Saida</SelectItem>
            <SelectItem value="absent" className="cursor-pointer">Ausente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funcionario</TableHead>
              <TableHead className="text-center">Entrada</TableHead>
              <TableHead className="text-center">Saida Almoco</TableHead>
              <TableHead className="text-center">Retorno</TableHead>
              <TableHead className="text-center">Saida</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum funcionario encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp) => {
                const statusBadge = STATUS_BADGES[emp.status];

                return (
                  <TableRow key={emp.userId}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{emp.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {emp.role}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {getMarkingTime(emp, 'clock_in')}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {getMarkingTime(emp, 'lunch_out')}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {getMarkingTime(emp, 'lunch_in')}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {getMarkingTime(emp, 'clock_out')}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {emp.entry
                        ? formatMinutes(emp.entry.summary.totalWorkedMinutes)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusBadge.variant}>
                        {statusBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() =>
                            router.push(`/ponto/admin/${emp.userId}`)
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {emp.entry && onEditEntry && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => onEditEntry(emp)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
