'use client';

import { MesStatus } from '@/types/mesversario';
import { cn } from '@/lib/utils';
import { getMesStatusColor, getMesStatusLabel } from '@/lib/mesversario-utils';

interface MesStatusBadgeProps {
  status: MesStatus;
  className?: string;
}

/**
 * Soft pill badge for a month status. Mirrors PedidoStatusBadge's shape.
 */
export function MesStatusBadge({ status, className }: MesStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        getMesStatusColor(status),
        className
      )}
    >
      {getMesStatusLabel(status)}
    </span>
  );
}
