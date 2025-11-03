'use client';

import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown } from 'lucide-react';

interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  label?: string;
}

export function LoadMoreButton({
  onClick,
  isLoading = false,
  disabled = false,
  label = 'Carregar Mais'
}: LoadMoreButtonProps) {
  return (
    <div className="flex justify-center pt-4">
      <Button
        onClick={onClick}
        disabled={disabled || isLoading}
        variant="outline"
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        {label}
      </Button>
    </div>
  );
}
