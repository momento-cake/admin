'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Box, Plus } from 'lucide-react';

interface EmptyStateProps {
  onCreateClick: () => void;
}

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="pt-12 pb-12">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="bg-muted rounded-full p-4">
            <Box className="h-8 w-8 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Nenhuma Embalagem Registrada</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Comece a gerenciar suas embalagens criando o primeiro item do seu inventário.
            </p>
          </div>

          <Button onClick={onCreateClick} className="gap-2 mt-4">
            <Plus className="h-4 w-4" />
            Adicionar Primeira Embalagem
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
