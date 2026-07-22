'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatErrorMessage } from '@/lib/error-handler';
import type { Mesversario } from '@/types/mesversario';

interface DeleteMesversarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mesversario: Mesversario;
  onConfirm: () => Promise<void>;
}

/**
 * Confirm soft-deleting a mesversário. Linked orders are detached (not deleted),
 * so warn how many will be unlinked before the user confirms.
 */
export function DeleteMesversarioDialog({
  open,
  onOpenChange,
  mesversario,
  onConfirm,
}: DeleteMesversarioDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const linked = mesversario.meses.filter((m) => m.pedidoId).length;

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      toast.success('Mesversário excluído');
      onOpenChange(false);
    } catch (err) {
      toast.error('Erro ao excluir mesversário', { description: formatErrorMessage(err) });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza de que deseja excluir o mesversário de &quot;{mesversario.bebeNome}
            &quot;? Esta ação não pode ser desfeita.
            {linked > 0 && (
              <>
                {' '}
                {linked} pedido(s) vinculado(s) será(ão) desvinculado(s). Os pedidos serão
                mantidos.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={deleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
