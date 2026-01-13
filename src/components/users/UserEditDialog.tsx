'use client';

import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserModel, UserRole, ROLE_LABELS } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UserEditDialogProps {
  user: UserModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UserEditDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: UserEditDialogProps) {
  const { userModel: currentUser } = useAuth();
  const [role, setRole] = useState<UserRole>(user.role.type);
  const [loading, setLoading] = useState(false);

  const isOwnAccount = currentUser?.uid === user.uid;

  const handleSubmit = async () => {
    if (isOwnAccount && role !== user.role.type) {
      toast.error('Voce nao pode alterar seu proprio cargo');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'role.type': role,
      });

      // Update the cookie if changing own role (shouldn't happen but just in case)
      if (!isOwnAccount && typeof document !== 'undefined') {
        // The cookie will be updated on next auth state change
      }

      toast.success('Usuario atualizado com sucesso');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={user.displayName || 'Sem nome'} disabled />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled />
          </div>

          <div className="space-y-2">
            <Label>Cargo</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
              disabled={isOwnAccount}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                <SelectItem value="atendente">{ROLE_LABELS.atendente}</SelectItem>
              </SelectContent>
            </Select>
            {isOwnAccount && (
              <p className="text-sm text-muted-foreground">
                Voce nao pode alterar seu proprio cargo
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
