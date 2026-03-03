'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeEntryAuditLog, AuditAction } from '@/types/time-tracking';
import {
  formatAuditAction,
  formatChangeField,
} from '@/lib/time-tracking-utils';
import { History, User, Clock, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLogProps {
  timeEntryId?: string;
  userId?: string;
  compact?: boolean;
}

const ACTION_COLORS: Record<AuditAction, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  manual_create: 'bg-amber-100 text-amber-800',
  manual_update: 'bg-orange-100 text-orange-800',
};

/**
 * Audit trail display component.
 * Shows immutable audit log entries with visual diffs.
 */
export function AuditLog({ timeEntryId, userId, compact = false }: AuditLogProps) {
  const [logs, setLogs] = useState<TimeEntryAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (timeEntryId) params.set('timeEntryId', timeEntryId);
        if (userId) params.set('userId', userId);

        const response = await fetch(
          `/api/time-tracking/audit?${params.toString()}`
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erro ao buscar auditoria');
        }

        const result = await response.json();
        setLogs(result.data || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erro ao buscar auditoria'
        );
      } finally {
        setLoading(false);
      }
    }

    if (timeEntryId || userId) {
      fetchLogs();
    } else {
      setLogs([]);
      setLoading(false);
    }
  }, [timeEntryId, userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Historico de Alteracoes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    if (compact) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Historico de Alteracoes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhuma alteracao registrada.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Historico de Alteracoes
          <Badge variant="secondary" className="ml-auto">
            {logs.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.map((log) => (
            <AuditLogEntry key={log.id} log={log} compact={compact} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Single Audit Log Entry
// ---------------------------------------------------------------------------

function AuditLogEntry({
  log,
  compact,
}: {
  log: TimeEntryAuditLog;
  compact: boolean;
}) {
  const timestamp = log.timestamp instanceof Date
    ? log.timestamp
    : new Date(log.timestamp as any);

  return (
    <div className="relative pl-6 pb-4 last:pb-0 border-l-2 border-muted ml-2">
      <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-background border-2 border-muted-foreground/30" />

      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={ACTION_COLORS[log.action]} variant="secondary">
            {formatAuditAction(log.action)}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(timestamp, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
          </span>
        </div>

        <div className="text-sm flex items-center gap-1 text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{log.performedByName || log.performedBy}</span>
        </div>

        {log.reason && (
          <div className="text-sm flex items-start gap-1 mt-1">
            <FileText className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
            <span className="italic">&quot;{log.reason}&quot;</span>
          </div>
        )}

        {!compact && log.changes.length > 0 && (
          <div className="mt-2 space-y-1">
            {log.changes.map((change, idx) => (
              <ChangeDetail key={idx} change={change} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Change Detail (Visual Diff)
// ---------------------------------------------------------------------------

function ChangeDetail({
  change,
}: {
  change: { field: string; oldValue: unknown; newValue: unknown };
}) {
  const fieldLabel = formatChangeField(change.field);

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') {
      // Handle timestamp-like objects
      const obj = value as Record<string, any>;
      if (obj.timestamp) {
        try {
          return format(new Date(obj.timestamp), 'HH:mm', { locale: ptBR });
        } catch {
          return JSON.stringify(value);
        }
      }
      if (obj.type && obj.timestamp) {
        return `${obj.type}: ${format(new Date(obj.timestamp), 'HH:mm')}`;
      }
      // For arrays of markings
      if (Array.isArray(value)) {
        return value
          .map((v: any) => {
            if (v.type && v.timestamp) {
              try {
                return `${v.type}: ${format(new Date(v.timestamp), 'HH:mm')}`;
              } catch {
                return JSON.stringify(v);
              }
            }
            return JSON.stringify(v);
          })
          .join(', ');
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <div className="text-xs bg-muted/50 rounded px-2 py-1.5">
      <span className="font-medium">{fieldLabel}</span>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-red-600 line-through">
          {formatValue(change.oldValue)}
        </span>
        <span className="text-muted-foreground">&rarr;</span>
        <span className="text-green-600">{formatValue(change.newValue)}</span>
      </div>
    </div>
  );
}
