'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  generatePayrollCSV,
  generateEspelhoPDF,
  downloadCSV,
  downloadPDF,
} from '@/lib/time-tracking-export';
import { TimeEntry } from '@/types/time-tracking';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUserId?: string;
  defaultEmployeeName?: string;
}

type ExportFormat = 'csv' | 'pdf';

export function ExportModal({
  isOpen,
  onClose,
  defaultUserId,
  defaultEmployeeName,
}: ExportModalProps) {
  const { isAdmin } = usePermissions();
  const now = new Date();

  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [startDate, setStartDate] = useState(
    format(startOfMonth(now), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(now), 'yyyy-MM-dd')
  );
  const [employeeName, setEmployeeName] = useState(
    defaultEmployeeName || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch entries via API
      const params = new URLSearchParams({
        startDate,
        endDate,
        type: 'single',
      });
      if (defaultUserId) {
        params.set('userId', defaultUserId);
      }

      const response = await fetch(
        `/api/time-tracking/export?${params.toString()}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao buscar dados para exportacao');
      }

      const result = await response.json();
      const entries: TimeEntry[] = result.data.entries || [];

      if (entries.length === 0) {
        setError('Nenhum registro encontrado para o periodo selecionado');
        return;
      }

      const name = employeeName || 'Funcionario';
      const periodLabel = `${format(new Date(startDate + 'T12:00:00'), 'MM-yyyy')}`;

      if (exportFormat === 'csv') {
        const csv = generatePayrollCSV(entries, name);
        downloadCSV(csv, `ponto-${name.replace(/\s+/g, '-')}-${periodLabel}.csv`);
      } else {
        const blob = await generateEspelhoPDF(
          entries,
          name,
          startDate,
          endDate,
          {
            name: 'Momento Cake',
            cnpj: '00.000.000/0001-00',
          }
        );
        downloadPDF(
          blob,
          `espelho-ponto-${name.replace(/\s+/g, '-')}-${periodLabel}.pdf`
        );
      }

      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao gerar exportacao'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Espelho de Ponto
          </DialogTitle>
          <DialogDescription>
            Exporte os registros de ponto em CSV ou PDF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Formato</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportFormat('pdf')}
                className="flex-1 cursor-pointer"
              >
                <FileText className="mr-1 h-4 w-4" />
                PDF
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  Portaria 671
                </Badge>
              </Button>
              <Button
                type="button"
                variant={exportFormat === 'csv' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportFormat('csv')}
                className="flex-1 cursor-pointer"
              >
                <FileSpreadsheet className="mr-1 h-4 w-4" />
                CSV
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  Folha
                </Badge>
              </Button>
            </div>
          </div>

          {/* Employee Name */}
          <div className="space-y-2">
            <Label htmlFor="employeeName">Nome do Funcionario</Label>
            <Input
              id="employeeName"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="Nome para o relatorio"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="cursor-pointer"
              />
            </div>
          </div>

          {/* Format Info */}
          <div className="bg-muted px-3 py-2 rounded-md text-xs text-muted-foreground">
            {exportFormat === 'pdf' ? (
              <>
                O PDF segue o formato de Espelho de Ponto conforme Portaria
                671/2021 (REP-P), incluindo CNPJ do empregador, todas as
                marcacoes e totais do periodo.
              </>
            ) : (
              <>
                O CSV usa separador ponto-e-virgula (;) e codificacao UTF-8
                com BOM para compatibilidade com Excel. Ideal para integracao
                com sistemas de folha de pagamento.
              </>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className="cursor-pointer"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : exportFormat === 'pdf' ? (
              <FileText className="mr-2 h-4 w-4" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Exportar {exportFormat.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
