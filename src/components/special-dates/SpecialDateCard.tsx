'use client'

import Link from 'next/link'
import { SpecialDateWithClient } from '@/lib/clients'
import { getDateTypeEmoji, getDateTypeLabel } from '@/lib/special-dates-utils'
import { Card } from '@/components/ui/card'

interface SpecialDateCardProps {
  entry: SpecialDateWithClient
}

/**
 * Card component for displaying a single special date entry
 */
export function SpecialDateCard({ entry }: SpecialDateCardProps) {
  const emoji = getDateTypeEmoji(entry.type)
  const typeLabel = getDateTypeLabel(entry.type)
  const relatedPersonLabel = entry.relatedPersonName ? ` → ${entry.relatedPersonName}` : ''

  return (
    <Card className="p-4 mb-3 transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        {/* Left side: Emoji and main content */}
        <div className="flex items-start gap-3 flex-1">
          {/* Emoji/Icon */}
          <div className="text-2xl mt-0.5 flex-shrink-0">{emoji}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Client name (clickable) */}
            <Link
              href={`/clients/${entry.clientId}`}
              className="text-base font-semibold text-primary hover:text-primary/80 hover:underline block truncate"
            >
              {entry.clientName}
            </Link>

            {/* Date type and relative date */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm font-medium text-foreground">{typeLabel}</span>
              {entry.relatedPersonName && (
                <span className="text-sm text-muted-foreground">{relatedPersonLabel}</span>
              )}
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm font-medium text-warning">{entry.relativeDate}</span>
            </div>

            {/* Formatted date */}
            <div className="text-sm text-muted-foreground mt-1">{entry.displayDate}</div>

            {/* Notes if present */}
            {entry.notes && (
              <div className="text-sm text-muted-foreground mt-2 italic">
                Notas: {entry.notes}
              </div>
            )}
          </div>
        </div>

        {/* Right side: Navigation arrow */}
        <Link
          href={`/clients/${entry.clientId}`}
          className="flex-shrink-0 text-muted-foreground/70 hover:text-muted-foreground transition-colors text-xl"
          aria-label="Ir para detalhes do cliente"
        >
          →
        </Link>
      </div>
    </Card>
  )
}
