'use client'

import { Button } from '@/components/ui/button'

interface LoadMoreButtonProps {
  direction: 'earlier' | 'later'
  onClick: () => void
  isLoading?: boolean
  daysRange?: number
}

/**
 * Button component for loading additional special dates
 */
export function LoadMoreButton({
  direction,
  onClick,
  isLoading = false,
  daysRange
}: LoadMoreButtonProps) {
  const isPast = direction === 'earlier'
  const label = isPast ? 'Carregar Datas Anteriores' : 'Carregar Datas Posteriores'
  const loadingLabel = isPast ? 'Carregando...' : 'Carregando...'
  const icon = isPast ? '←' : '→'

  return (
    <div className="flex justify-center my-4">
      <Button
        onClick={onClick}
        disabled={isLoading}
        variant="outline"
        className="gap-2"
        aria-label={label}
      >
        {isLoading ? loadingLabel : label}
        {!isLoading && <span className="text-lg">{icon}</span>}
      </Button>
    </div>
  )
}
