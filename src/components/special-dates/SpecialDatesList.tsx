'use client'

import { useState, useMemo } from 'react'
import { Client } from '@/types/client'
import { SpecialDateCard } from './SpecialDateCard'
import { LoadMoreButton } from './LoadMoreButton'
import { transformClientDatesToEntries, hasOlderDates, hasFutureDates } from '@/lib/special-dates-transformer'
import { Skeleton } from '@/components/ui/skeleton'

interface SpecialDatesListProps {
  clients: Client[]
  isLoading?: boolean
}

/**
 * List container component for special dates with pagination
 */
export function SpecialDatesList({ clients, isLoading = false }: SpecialDatesListProps) {
  // Track the current date range
  // Default: past 30 days + next 365 days to show a full year of upcoming dates
  const [pastDays, setPastDays] = useState(30)
  const [futureDays, setFutureDays] = useState(365)

  // Track loading state for expand buttons
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Transform and filter dates based on current range
  const specialDates = useMemo(() => {
    return transformClientDatesToEntries(clients, -pastDays, futureDays)
  }, [clients, pastDays, futureDays])

  // Check if we can expand in either direction
  const canLoadEarlier = useMemo(() => {
    return hasOlderDates(clients, pastDays)
  }, [clients, pastDays])

  const canLoadLater = useMemo(() => {
    return hasFutureDates(clients, futureDays)
  }, [clients, futureDays])

  // Handle loading earlier dates
  const handleLoadEarlier = () => {
    setIsLoadingMore(true)
    // Simulate loading delay for UX
    setTimeout(() => {
      setPastDays(prev => prev + 30)
      setIsLoadingMore(false)
    }, 300)
  }

  // Handle loading future dates
  const handleLoadLater = () => {
    setIsLoadingMore(true)
    // Simulate loading delay for UX
    setTimeout(() => {
      setFutureDays(prev => prev + 30)
      setIsLoadingMore(false)
    }, 300)
  }

  // Show skeleton loaders while initial data is loading
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  // Empty state
  if (specialDates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          Nenhuma data especial encontrada neste período.
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Tente expandir o período ou adicionar datas especiais aos clientes.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Load Earlier Dates Button */}
      {canLoadEarlier && (
        <LoadMoreButton
          direction="earlier"
          onClick={handleLoadEarlier}
          isLoading={isLoadingMore}
          daysRange={pastDays}
        />
      )}

      {/* Special Dates List */}
      <div className="space-y-3">
        {specialDates.map(entry => (
          <SpecialDateCard key={entry.dateId} entry={entry} />
        ))}
      </div>

      {/* Load Future Dates Button */}
      {canLoadLater && (
        <LoadMoreButton
          direction="later"
          onClick={handleLoadLater}
          isLoading={isLoadingMore}
          daysRange={futureDays}
        />
      )}
    </div>
  )
}
