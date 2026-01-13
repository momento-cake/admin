'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Box, Plus, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  onCreateClick?: () => void;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  onCreateClick,
  icon: Icon = Box,
  title = "Nenhuma Embalagem Registrada",
  description = "Comece a gerenciar suas embalagens criando o primeiro item do seu inventário.",
  action
}: EmptyStateProps) {
  // Support both old and new API
  const handleClick = action?.onClick || onCreateClick;
  const buttonLabel = action?.label || "Adicionar Primeira Embalagem";

  return (
    <Card className="border-dashed">
      <CardContent className="pt-12 pb-12">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="bg-muted rounded-full p-4">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {description}
            </p>
          </div>

          {handleClick && (
            <Button onClick={handleClick} className="gap-2 mt-4">
              <Plus className="h-4 w-4" />
              {buttonLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
