'use client';

import { Cake } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { MesversarioCard } from '@/components/mesversarios/MesversarioCard';
import type { Mesversario } from '@/types/mesversario';

interface MesversariosListProps {
  mesversarios: Mesversario[];
  onNew?: () => void;
}

/**
 * Responsive grid of mesversário summary cards, with an empty state.
 */
export function MesversariosList({ mesversarios, onNew }: MesversariosListProps) {
  if (mesversarios.length === 0) {
    return (
      <EmptyState
        icon={Cake}
        title="Nenhum mesversário ainda"
        description="Comece a acompanhar a jornada dos primeiros 12 meses de um bebê."
        action={onNew ? { label: 'Novo mesversário', onClick: onNew } : undefined}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {mesversarios.map((m) => (
        <MesversarioCard key={m.id} mesversario={m} />
      ))}
    </div>
  );
}
