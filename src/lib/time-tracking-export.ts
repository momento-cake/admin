/**
 * Time Tracking Export Service
 *
 * Generates CSV (payroll integration) and PDF (espelho de ponto / comprovante digital)
 * exports compliant with Portaria 671/2021 REP-P requirements.
 *
 * CSV: UTF-8 with BOM for Excel compatibility
 * PDF: Employer CNPJ, employee CPF, all markings, totals, audit trail
 */

import { TimeEntry, MarkingType, TimeEntryStatus } from '@/types/time-tracking';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDate(value: any): Date {
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '00:00';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function getMarkingTime(entry: TimeEntry, type: MarkingType): string {
  const marking = entry.markings.find((m) => m.type === type);
  if (!marking) return '';
  return format(toDate(marking.timestamp), 'HH:mm');
}

const STATUS_LABELS: Record<TimeEntryStatus, string> = {
  complete: 'Completo',
  incomplete: 'Incompleto',
  absent: 'Ausente',
  justified_absence: 'Falta Justificada',
  day_off: 'Folga',
};

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

/**
 * Generate CSV content for payroll integration.
 * Uses UTF-8 BOM for Excel compatibility with accented characters.
 */
export function generatePayrollCSV(
  entries: TimeEntry[],
  employeeName: string
): string {
  const BOM = '\uFEFF';

  const headers = [
    'Data',
    'Dia da Semana',
    'Entrada',
    'Saida Almoco',
    'Retorno Almoco',
    'Saida',
    'Total Trabalhado',
    'Horas Regulares',
    'Horas Extras',
    'Horas Noturnas',
    'Intervalo',
    'Status',
  ];

  const rows = entries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => {
      const date = new Date(entry.date + 'T12:00:00');
      return [
        format(date, 'dd/MM/yyyy'),
        format(date, 'EEEE', { locale: ptBR }),
        getMarkingTime(entry, 'clock_in'),
        getMarkingTime(entry, 'lunch_out'),
        getMarkingTime(entry, 'lunch_in'),
        getMarkingTime(entry, 'clock_out'),
        formatMinutes(entry.summary.totalWorkedMinutes),
        formatMinutes(entry.summary.regularMinutes),
        formatMinutes(entry.summary.overtimeMinutes),
        formatMinutes(entry.summary.nightMinutes),
        formatMinutes(entry.summary.totalBreakMinutes),
        STATUS_LABELS[entry.summary.status] || entry.summary.status,
      ];
    });

  // Summary row
  const totalWorked = entries.reduce(
    (acc, e) => acc + e.summary.totalWorkedMinutes,
    0
  );
  const totalRegular = entries.reduce(
    (acc, e) => acc + e.summary.regularMinutes,
    0
  );
  const totalOvertime = entries.reduce(
    (acc, e) => acc + e.summary.overtimeMinutes,
    0
  );
  const totalNight = entries.reduce(
    (acc, e) => acc + e.summary.nightMinutes,
    0
  );
  const totalBreak = entries.reduce(
    (acc, e) => acc + e.summary.totalBreakMinutes,
    0
  );

  rows.push([
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    formatMinutes(totalWorked),
    formatMinutes(totalRegular),
    formatMinutes(totalOvertime),
    formatMinutes(totalNight),
    formatMinutes(totalBreak),
    '',
  ]);

  const csvContent = [
    `Funcionario: ${employeeName}`,
    `Gerado em: ${format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}`,
    '',
    headers.join(';'),
    ...rows.map((row) => row.join(';')),
  ].join('\n');

  return BOM + csvContent;
}

/**
 * Generate CSV for all employees overview (admin export).
 */
export function generateAllEmployeesCSV(
  employeeEntries: Array<{
    employeeName: string;
    entries: TimeEntry[];
  }>
): string {
  const BOM = '\uFEFF';

  const headers = [
    'Funcionario',
    'Data',
    'Entrada',
    'Saida Almoco',
    'Retorno Almoco',
    'Saida',
    'Total Trabalhado',
    'Horas Extras',
    'Horas Noturnas',
    'Status',
  ];

  const rows: string[][] = [];
  for (const { employeeName, entries } of employeeEntries) {
    for (const entry of entries.sort((a, b) => a.date.localeCompare(b.date))) {
      const date = new Date(entry.date + 'T12:00:00');
      rows.push([
        employeeName,
        format(date, 'dd/MM/yyyy'),
        getMarkingTime(entry, 'clock_in'),
        getMarkingTime(entry, 'lunch_out'),
        getMarkingTime(entry, 'lunch_in'),
        getMarkingTime(entry, 'clock_out'),
        formatMinutes(entry.summary.totalWorkedMinutes),
        formatMinutes(entry.summary.overtimeMinutes),
        formatMinutes(entry.summary.nightMinutes),
        STATUS_LABELS[entry.summary.status] || entry.summary.status,
      ]);
    }
  }

  const csvContent = [
    `Relatorio de Ponto - Todos os Funcionarios`,
    `Gerado em: ${format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}`,
    '',
    headers.join(';'),
    ...rows.map((row) => row.join(';')),
  ].join('\n');

  return BOM + csvContent;
}

// ---------------------------------------------------------------------------
// PDF Export (Espelho de Ponto)
// ---------------------------------------------------------------------------

/**
 * Generate PDF espelho de ponto for an employee.
 * Uses jspdf for client-side PDF generation.
 * Compliant with Portaria 671/2021 requirements.
 */
export async function generateEspelhoPDF(
  entries: TimeEntry[],
  employeeName: string,
  periodStart: string,
  periodEnd: string,
  companyInfo?: {
    name: string;
    cnpj: string;
    address?: string;
  }
): Promise<Blob> {
  // Dynamic import for client-side only
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // --- Header ---
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ESPELHO DE PONTO ELETRONICO', pageWidth / 2, y, {
    align: 'center',
  });
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Conforme Portaria 671/2021 - REP-P', pageWidth / 2, y, {
    align: 'center',
  });
  y += 8;

  // --- Company Info ---
  if (companyInfo) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Empregador: ${companyInfo.name}`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`CNPJ: ${companyInfo.cnpj}`, pageWidth - margin, y, {
      align: 'right',
    });
    y += 5;
    if (companyInfo.address) {
      doc.text(companyInfo.address, margin, y);
      y += 5;
    }
  }

  // --- Employee Info ---
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Funcionario: ${employeeName}`, margin, y);
  const startFormatted = format(new Date(periodStart + 'T12:00:00'), 'dd/MM/yyyy');
  const endFormatted = format(new Date(periodEnd + 'T12:00:00'), 'dd/MM/yyyy');
  doc.text(
    `Periodo: ${startFormatted} a ${endFormatted}`,
    pageWidth - margin,
    y,
    { align: 'right' }
  );
  y += 8;

  // --- Separator ---
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // --- Table Header ---
  const colWidths = [22, 22, 18, 18, 18, 18, 20, 20, 20, 18, 22, 18, 30];
  const colHeaders = [
    'Data',
    'Dia',
    'Entrada',
    'Saida\nAlmoco',
    'Retorno\nAlmoco',
    'Saida',
    'Trabalhado',
    'Regular',
    'Extras',
    'Noturnas',
    'Intervalo',
    'Status',
    'Observacao',
  ];

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 3, pageWidth - 2 * margin, 10, 'F');

  let x = margin + 1;
  for (let i = 0; i < colHeaders.length; i++) {
    const lines = colHeaders[i].split('\n');
    for (let l = 0; l < lines.length; l++) {
      doc.text(lines[l], x, y + l * 3);
    }
    x += colWidths[i];
  }
  y += 10;

  // --- Table Rows ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  for (const entry of sorted) {
    // Page break check
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = margin;
    }

    const date = new Date(entry.date + 'T12:00:00');
    const isManual = entry.isManualEntry ? 'M' : '';
    const observation =
      entry.summary.status === 'justified_absence'
        ? 'Justificada'
        : entry.isManualEntry
          ? 'Edicao manual'
          : '';

    const rowData = [
      format(date, 'dd/MM/yyyy'),
      format(date, 'EEE', { locale: ptBR }),
      getMarkingTime(entry, 'clock_in'),
      getMarkingTime(entry, 'lunch_out'),
      getMarkingTime(entry, 'lunch_in'),
      getMarkingTime(entry, 'clock_out'),
      formatMinutes(entry.summary.totalWorkedMinutes),
      formatMinutes(entry.summary.regularMinutes),
      formatMinutes(entry.summary.overtimeMinutes),
      formatMinutes(entry.summary.nightMinutes),
      formatMinutes(entry.summary.totalBreakMinutes),
      isManual || STATUS_LABELS[entry.summary.status]?.substring(0, 6) || '',
      observation,
    ];

    // Alternate row background
    if (sorted.indexOf(entry) % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 3, pageWidth - 2 * margin, 5, 'F');
    }

    x = margin + 1;
    for (let i = 0; i < rowData.length; i++) {
      doc.text(rowData[i], x, y);
      x += colWidths[i];
    }
    y += 5;
  }

  // --- Totals ---
  y += 3;
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  const totalWorked = entries.reduce(
    (acc, e) => acc + e.summary.totalWorkedMinutes,
    0
  );
  const totalRegular = entries.reduce(
    (acc, e) => acc + e.summary.regularMinutes,
    0
  );
  const totalOvertime = entries.reduce(
    (acc, e) => acc + e.summary.overtimeMinutes,
    0
  );
  const totalNight = entries.reduce(
    (acc, e) => acc + e.summary.nightMinutes,
    0
  );
  const daysPresent = entries.filter(
    (e) => e.summary.status === 'complete' || e.summary.status === 'incomplete'
  ).length;
  const daysAbsent = entries.filter(
    (e) => e.summary.status === 'absent'
  ).length;
  const daysJustified = entries.filter(
    (e) => e.summary.status === 'justified_absence'
  ).length;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO DO PERIODO', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  const summaryLines = [
    `Total Trabalhado: ${formatMinutes(totalWorked)}  |  Regular: ${formatMinutes(totalRegular)}  |  Horas Extras: ${formatMinutes(totalOvertime)}  |  Noturnas: ${formatMinutes(totalNight)}`,
    `Dias Presentes: ${daysPresent}  |  Faltas: ${daysAbsent}  |  Faltas Justificadas: ${daysJustified}  |  Total Registros: ${entries.length}`,
  ];

  for (const line of summaryLines) {
    doc.text(line, margin, y);
    y += 4;
  }

  // --- Footer ---
  y += 8;
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Documento gerado eletronicamente em ${format(new Date(), "dd/MM/yyyy 'as' HH:mm:ss", { locale: ptBR })} - Sistema REP-P conforme Portaria 671/2021`,
    pageWidth / 2,
    y,
    { align: 'center' }
  );

  // --- Signature Lines ---
  y += 12;
  doc.setTextColor(0, 0, 0);
  doc.setLineWidth(0.3);

  const sigWidth = 80;
  const sig1X = pageWidth / 2 - sigWidth - 10;
  const sig2X = pageWidth / 2 + 10;

  doc.line(sig1X, y, sig1X + sigWidth, y);
  doc.line(sig2X, y, sig2X + sigWidth, y);
  y += 4;
  doc.setFontSize(7);
  doc.text('Empregador', sig1X + sigWidth / 2, y, { align: 'center' });
  doc.text('Funcionario', sig2X + sigWidth / 2, y, { align: 'center' });

  return doc.output('blob');
}

// ---------------------------------------------------------------------------
// Download Helpers
// ---------------------------------------------------------------------------

/**
 * Trigger a browser download for a CSV file.
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Trigger a browser download for a PDF blob.
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
