'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeEntry, TimeMarking } from '@/types/time-tracking';
import { EditMarkingModal } from '@/components/time-tracking/EditMarkingModal';
import { AddMarkingModal } from '@/components/time-tracking/AddMarkingModal';
import { JustifyAbsenceModal } from '@/components/time-tracking/JustifyAbsenceModal';
import { AuditLog } from '@/components/time-tracking/AuditLog';
import {
  Pencil,
  Plus,
  FileCheck,
  Shield,
} from 'lucide-react';

interface AdminEditPanelProps {
  entry: TimeEntry;
  onUpdateMarkings: (
    entryId: string,
    markings: TimeMarking[],
    reason: string
  ) => Promise<void>;
  onJustifyAbsence: (
    entryId: string,
    status: 'justified_absence' | 'absent',
    reason: string
  ) => Promise<void>;
}

/**
 * Admin edit controls panel for a time entry.
 * Provides edit, add marking, and justify absence actions.
 * Shows audit trail for the entry.
 */
export function AdminEditPanel({
  entry,
  onUpdateMarkings,
  onJustifyAbsence,
}: AdminEditPanelProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [justifyModalOpen, setJustifyModalOpen] = useState(false);
  const [selectedMarking, setSelectedMarking] = useState<TimeMarking | null>(
    null
  );

  const hasMarkings = entry.markings.length > 0;
  const allMarkingsComplete = entry.markings.length === 4;
  const isAbsent =
    entry.summary.status === 'absent' ||
    entry.summary.status === 'justified_absence';

  return (
    <div className="space-y-4">
      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Acoes Administrativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {!allMarkingsComplete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddModalOpen(true)}
                className="cursor-pointer"
              >
                <Plus className="mr-1 h-4 w-4" />
                Adicionar Marcacao
              </Button>
            )}

            {hasMarkings && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Open edit for the most recent marking
                  const lastMarking =
                    entry.markings[entry.markings.length - 1];
                  setSelectedMarking(lastMarking);
                  setEditModalOpen(true);
                }}
                className="cursor-pointer"
              >
                <Pencil className="mr-1 h-4 w-4" />
                Editar Marcacao
              </Button>
            )}

            {(isAbsent || entry.markings.length === 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setJustifyModalOpen(true)}
                className="cursor-pointer"
              >
                <FileCheck className="mr-1 h-4 w-4" />
                Justificar Falta
              </Button>
            )}
          </div>

          {/* Individual marking edit buttons */}
          {hasMarkings && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Editar marcacao especifica:
              </p>
              <div className="flex flex-wrap gap-1">
                {entry.markings.map((marking) => {
                  const LABELS: Record<string, string> = {
                    clock_in: 'Entrada',
                    lunch_out: 'Saida Almoco',
                    lunch_in: 'Retorno',
                    clock_out: 'Saida',
                  };
                  const ts =
                    marking.timestamp instanceof Date
                      ? marking.timestamp
                      : new Date(marking.timestamp as any);
                  const timeStr = ts.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <Button
                      key={marking.id}
                      variant="ghost"
                      size="sm"
                      className="text-xs cursor-pointer"
                      onClick={() => {
                        setSelectedMarking(marking);
                        setEditModalOpen(true);
                      }}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      {LABELS[marking.type]} ({timeStr})
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <AuditLog timeEntryId={entry.id} />

      {/* Modals */}
      {selectedMarking && (
        <EditMarkingModal
          entry={entry}
          marking={selectedMarking}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedMarking(null);
          }}
          onSave={onUpdateMarkings}
        />
      )}

      <AddMarkingModal
        entry={entry}
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={onUpdateMarkings}
      />

      <JustifyAbsenceModal
        entry={entry}
        isOpen={justifyModalOpen}
        onClose={() => setJustifyModalOpen(false)}
        onSave={onJustifyAbsence}
      />
    </div>
  );
}
