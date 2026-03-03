'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle,
  Clock,
  XCircle,
  Coffee,
  AlertTriangle,
  Users,
} from 'lucide-react';

interface EmployeeStatusCardsProps {
  stats: {
    onTime: number;
    late: number;
    absent: number;
    onLunch: number;
    notClockedOut: number;
    complete: number;
    total: number;
  };
}

const STATUS_CARDS = [
  {
    key: 'complete' as const,
    label: 'Completo',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    key: 'onTime' as const,
    label: 'No Horario',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    key: 'onLunch' as const,
    label: 'No Almoco',
    icon: Coffee,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    key: 'notClockedOut' as const,
    label: 'Sem Saida',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    key: 'absent' as const,
    label: 'Ausente',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  {
    key: 'total' as const,
    label: 'Total',
    icon: Users,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
];

export function EmployeeStatusCards({ stats }: EmployeeStatusCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {STATUS_CARDS.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key];

        return (
          <Card key={card.key}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
