'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useTimeTrackingAdmin,
  EmployeeStatus,
} from '@/hooks/useTimeTrackingAdmin';
import { EmployeeStatusCards } from '@/components/time-tracking/admin/EmployeeStatusCards';
import { EmployeeOverviewTable } from '@/components/time-tracking/admin/EmployeeOverviewTable';
import { EditMarkingModal } from '@/components/time-tracking/EditMarkingModal';
import { AddMarkingModal } from '@/components/time-tracking/AddMarkingModal';
import { TimeMarking } from '@/types/time-tracking';
import { Shield, RefreshCw, Download } from 'lucide-react';
import { ExportModal } from '@/components/time-tracking/ExportModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PontoAdminPage() {
  const { isAdmin, loading: permLoading } = usePermissions();
  const {
    employees,
    loading,
    error,
    selectedDate,
    setSelectedDate,
    refresh,
    updateEntry,
    stats,
  } = useTimeTrackingAdmin();

  const [editEmployee, setEditEmployee] = useState<EmployeeStatus | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

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
          Apenas administradores podem acessar o painel de ponto.
        </p>
      </div>
    );
  }

  const handleEditEntry = (employee: EmployeeStatus) => {
    setEditEmployee(employee);
    if (employee.entry && employee.entry.markings.length < 4) {
      setAddModalOpen(true);
    } else if (employee.entry) {
      setEditModalOpen(true);
    }
  };

  const handleSaveMarkings = async (
    entryId: string,
    markings: TimeMarking[],
    reason: string
  ) => {
    await updateEntry(entryId, markings, reason);
    setEditModalOpen(false);
    setAddModalOpen(false);
    setEditEmployee(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-momento-text sm:text-3xl">
            <Shield className="h-7 w-7 text-amber-700" />
            Painel de Ponto
          </h1>
          <p className="text-muted-foreground">
            Visao geral de todos os funcionarios
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <Label htmlFor="date" className="text-xs">
              Data
            </Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[160px] cursor-pointer"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            className="mt-5 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportModalOpen(true)}
            className="mt-5 cursor-pointer"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Date display */}
      <p className="text-sm text-muted-foreground">
        {format(new Date(selectedDate + 'T12:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", {
          locale: ptBR,
        })}
      </p>

      {/* Status Cards */}
      <EmployeeStatusCards stats={stats} />

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle>Funcionarios</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeOverviewTable
            employees={employees}
            loading={loading}
            onEditEntry={handleEditEntry}
          />
        </CardContent>
      </Card>

      {/* Edit Modals */}
      {editEmployee?.entry &&
        editEmployee.entry.markings.length > 0 &&
        editModalOpen && (
          <EditMarkingModal
            entry={editEmployee.entry}
            marking={
              editEmployee.entry.markings[
                editEmployee.entry.markings.length - 1
              ]
            }
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setEditEmployee(null);
            }}
            onSave={handleSaveMarkings}
          />
        )}

      {editEmployee?.entry && addModalOpen && (
        <AddMarkingModal
          entry={editEmployee.entry}
          isOpen={addModalOpen}
          onClose={() => {
            setAddModalOpen(false);
            setEditEmployee(null);
          }}
          onSave={handleSaveMarkings}
        />
      )}

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
}
