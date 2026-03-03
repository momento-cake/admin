'use client';

import {
  DollarSign,
  Clock,
  Sun,
  Moon,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { PayrollCalculation } from '@/types/time-tracking';

interface PayrollBreakdownProps {
  payroll: PayrollCalculation | null;
  loading: boolean;
}

const currencyFormat = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

function formatRate(rate: number): string {
  return currencyFormat.format(rate) + '/h';
}

export function PayrollBreakdown({ payroll, loading }: PayrollBreakdownProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Calculando folha...
        </CardContent>
      </Card>
    );
  }

  if (!payroll) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhum dado para calculo de folha no periodo selecionado.
        </CardContent>
      </Card>
    );
  }

  const lineItems = [
    {
      label: 'Horas Regulares',
      icon: <Sun className="h-4 w-4 text-amber-500" />,
      hours: payroll.regularHours,
      rate: payroll.hourlyRate,
      multiplier: '1.00x',
      amount: payroll.regularPay,
    },
    {
      label: 'Horas Extras (55%)',
      icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
      hours: payroll.overtimeHours,
      rate: payroll.overtimeRate,
      multiplier: '1.55x',
      amount: payroll.overtimePay,
    },
    {
      label: 'Adicional Noturno (37%)',
      icon: <Moon className="h-4 w-4 text-indigo-500" />,
      hours: payroll.nightHours,
      rate: payroll.nightRate - payroll.hourlyRate,
      multiplier: '0.37x',
      amount: payroll.nightPremiumPay,
    },
    {
      label: 'Descanso/Feriado (100%)',
      icon: <Calendar className="h-4 w-4 text-blue-500" />,
      hours: payroll.restDayHours,
      rate: payroll.restDayRate,
      multiplier: '2.00x',
      amount: payroll.restDayPay,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-amber-700" />
          Demonstrativo de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payroll Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Componente</TableHead>
              <TableHead className="text-right">Horas</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Taxa</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Mult.</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item) => (
              <TableRow key={item.label}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {formatHours(item.hours)}
                </TableCell>
                <TableCell className="text-right text-sm hidden sm:table-cell">
                  {formatRate(item.rate)}
                </TableCell>
                <TableCell className="text-right text-sm hidden sm:table-cell">
                  {item.multiplier}
                </TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {currencyFormat.format(item.amount)}
                </TableCell>
              </TableRow>
            ))}
            {/* DSR Row */}
            <TableRow>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span className="text-sm">DSR (Descanso Semanal Remunerado)</span>
                  {payroll.dsrLost && (
                    <Badge variant="destructive" className="text-[10px]">
                      Perdido
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right text-sm">-</TableCell>
              <TableCell className="text-right text-sm hidden sm:table-cell">-</TableCell>
              <TableCell className="text-right text-sm hidden sm:table-cell">-</TableCell>
              <TableCell className="text-right text-sm font-medium">
                {currencyFormat.format(payroll.dsrValue)}
              </TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="text-right font-semibold">
                Total Bruto
              </TableCell>
              <TableCell className="text-right text-lg font-bold text-amber-700">
                {currencyFormat.format(payroll.grossPay)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>

        {/* Cesta Basica */}
        <div className="flex items-center gap-3 rounded-md border p-3">
          {payroll.cestaBasicaEligible ? (
            <>
              <ShieldCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Cesta Basica</p>
                <p className="text-xs text-muted-foreground">
                  Funcionario elegivel (Clausula 19a CCT)
                </p>
              </div>
              <Badge variant="success" className="ml-auto">
                Elegivel
              </Badge>
            </>
          ) : (
            <>
              <ShieldX className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Cesta Basica</p>
                <p className="text-xs text-muted-foreground">
                  Beneficio perdido por faltas ou atrasos (Clausula 19a CCT)
                </p>
              </div>
              <Badge variant="destructive" className="ml-auto">
                Inelegivel
              </Badge>
            </>
          )}
        </div>

        {/* Attendance Summary */}
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-md border p-2 text-center">
            <p className="text-xs text-muted-foreground">Dias Uteis</p>
            <p className="font-semibold">{payroll.totalWorkDays}</p>
          </div>
          <div className="rounded-md border p-2 text-center">
            <p className="text-xs text-muted-foreground">Presenca</p>
            <p className="font-semibold">{payroll.daysPresent}</p>
          </div>
          <div className="rounded-md border p-2 text-center">
            <p className="text-xs text-muted-foreground">Atrasos</p>
            <p className="font-semibold">
              {payroll.tardiness.count}x ({payroll.tardiness.totalMinutes}min)
            </p>
          </div>
          <div className="rounded-md border p-2 text-center">
            <p className="text-xs text-muted-foreground">Faltas</p>
            <p className="font-semibold">{payroll.daysAbsent}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
