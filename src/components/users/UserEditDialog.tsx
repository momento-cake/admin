'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserModel, UserRole, ROLE_LABELS, UserCustomPermissions } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Shield, ShieldAlert, Lock } from 'lucide-react';
import {
  FEATURE_METADATA,
  ACTION_LABELS,
  DEFAULT_ATENDENTE_PERMISSIONS,
  getCustomizableFeatures,
  canModifyUserPermissions,
  ActionKey,
  FeatureKey,
  CustomPermissions,
} from '@/lib/permissions';

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
  const [customPermissions, setCustomPermissions] = useState<CustomPermissions>({});
  const [loading, setLoading] = useState(false);

  const isOwnAccount = currentUser?.uid === user.uid;
  const isTargetAdmin = user.role.type === 'admin';
  const canModify = canModifyUserPermissions(currentUser, user);

  // Initialize permissions from user data
  useEffect(() => {
    if (user.customPermissions) {
      setCustomPermissions(user.customPermissions as CustomPermissions);
    } else {
      setCustomPermissions({});
    }
    setRole(user.role.type);
  }, [user]);

  // Get customizable features for this user
  const customizableFeatures = getCustomizableFeatures(user);

  // Check if a feature is enabled
  const isFeatureEnabled = (featureKey: FeatureKey): boolean => {
    // Check custom permissions first
    if (customPermissions[featureKey]?.enabled !== undefined) {
      return customPermissions[featureKey]!.enabled;
    }
    // Fall back to defaults
    return DEFAULT_ATENDENTE_PERMISSIONS[featureKey]?.enabled ?? false;
  };

  // Get enabled actions for a feature
  const getEnabledActions = (featureKey: FeatureKey): ActionKey[] => {
    if (customPermissions[featureKey]?.actions) {
      return customPermissions[featureKey]!.actions;
    }
    return DEFAULT_ATENDENTE_PERMISSIONS[featureKey]?.actions ?? [];
  };

  // Toggle feature enabled/disabled
  const toggleFeature = (featureKey: FeatureKey, enabled: boolean) => {
    const metadata = FEATURE_METADATA.find(f => f.key === featureKey);
    setCustomPermissions(prev => ({
      ...prev,
      [featureKey]: {
        enabled,
        actions: enabled ? (metadata?.availableActions.filter(a => a === 'view') || ['view']) : []
      }
    }));
  };

  // Toggle action for a feature
  const toggleAction = (featureKey: FeatureKey, action: ActionKey, enabled: boolean) => {
    setCustomPermissions(prev => {
      const current = prev[featureKey] || { enabled: true, actions: [] };
      const newActions = enabled
        ? [...new Set([...current.actions, action])]
        : current.actions.filter(a => a !== action);

      return {
        ...prev,
        [featureKey]: {
          ...current,
          enabled: current.enabled,
          actions: newActions
        }
      };
    });
  };

  const handleSubmit = async () => {
    if (isOwnAccount) {
      toast.error('Você não pode editar sua própria conta');
      return;
    }

    if (isTargetAdmin) {
      toast.error('Não é possível editar permissões de administradores');
      return;
    }

    setLoading(true);
    try {
      const updateData: Record<string, unknown> = {
        'role.type': role,
      };

      // Only save custom permissions for atendente
      if (role === 'atendente') {
        updateData.customPermissions = customPermissions;
        updateData.permissionsModifiedBy = currentUser?.uid;
        updateData.permissionsModifiedAt = Timestamp.now();
      } else {
        // Clear custom permissions if changing to admin
        updateData.customPermissions = null;
        updateData.permissionsModifiedBy = null;
        updateData.permissionsModifiedAt = null;
      }

      await updateDoc(doc(db, 'users', user.uid), updateData);

      toast.success('Usuário atualizado com sucesso');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    } finally {
      setLoading(false);
    }
  };

  // If target is admin, show read-only view
  if (isTargetAdmin) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Administrador
            </DialogTitle>
            <DialogDescription>
              Administradores têm acesso total ao sistema e não podem ter suas permissões modificadas.
            </DialogDescription>
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

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>Permissões de administrador não podem ser alteradas</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Editar Usuário e Permissões
          </DialogTitle>
          <DialogDescription>
            Configure o cargo e as permissões personalizadas para este usuário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={user.displayName || 'Sem nome'} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled />
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Cargo</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
              disabled={!canModify}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                <SelectItem value="atendente">{ROLE_LABELS.atendente}</SelectItem>
              </SelectContent>
            </Select>
            {role === 'admin' && (
              <p className="text-sm text-muted-foreground">
                Administradores têm acesso total a todas as funcionalidades.
              </p>
            )}
          </div>

          {/* Custom Permissions (only for atendente) */}
          {role === 'atendente' && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Permissões Personalizadas</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure quais funcionalidades este atendente pode acessar.
                  Por padrão, atendentes têm acesso apenas ao Dashboard e Clientes.
                </p>
              </div>

              <div className="space-y-4">
                {customizableFeatures.map((feature) => {
                  const enabled = isFeatureEnabled(feature.key);
                  const enabledActions = getEnabledActions(feature.key);
                  const isDefault = DEFAULT_ATENDENTE_PERMISSIONS[feature.key]?.enabled ?? false;

                  return (
                    <div
                      key={feature.key}
                      className={`p-4 border rounded-lg ${enabled ? 'border-primary/50 bg-primary/5' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`feature-${feature.key}`}
                            checked={enabled}
                            onCheckedChange={(checked) => toggleFeature(feature.key, !!checked)}
                          />
                          <div>
                            <label
                              htmlFor={`feature-${feature.key}`}
                              className="font-medium cursor-pointer"
                            >
                              {feature.label}
                              {isDefault && (
                                <span className="ml-2 text-xs text-muted-foreground">(padrão)</span>
                              )}
                            </label>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {enabled && feature.availableActions.length > 1 && (
                        <div className="mt-3 ml-7 flex flex-wrap gap-3">
                          {feature.availableActions.map((action) => (
                            <label
                              key={action}
                              className="flex items-center gap-2 text-sm cursor-pointer"
                            >
                              <Checkbox
                                checked={enabledActions.includes(action)}
                                onCheckedChange={(checked) =>
                                  toggleAction(feature.key, action, !!checked)
                                }
                                disabled={action === 'view'} // View is always required
                              />
                              <span>{ACTION_LABELS[action]}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !canModify}>
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
