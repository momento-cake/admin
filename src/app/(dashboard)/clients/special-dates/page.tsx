'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { fetchSpecialDatesForDashboard } from '@/lib/clients'
import { SpecialDatesList } from '@/components/special-dates/SpecialDatesList'
import { Client } from '@/types/client'

/**
 * Special Dates Dashboard Page
 *
 * Displays all clients with upcoming and recent special dates (birthdays, anniversaries, custom dates).
 * Users can expand the date range to see older or future dates.
 */
export default function SpecialDatesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadClients = async () => {
      try {
        setIsLoading(true)
        const fetchedClients = await fetchSpecialDatesForDashboard()
        setClients(fetchedClients)
        setError(null)
      } catch (err) {
        console.error('Error loading special dates:', err)
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar datas especiais'
        )
      } finally {
        setIsLoading(false)
      }
    }

    loadClients()
  }, [])

  return (
    <div className="min-h-screen bg-muted">
      {/* Page Container */}
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/clients" className="hover:text-foreground">
              Clientes
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Datas Especiais</span>
          </nav>

          {/* Title and Description */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Datas Especiais</h1>
            <p className="text-muted-foreground mt-2">
              Aniversários e datas importantes dos seus clientes
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-card rounded-lg shadow">
          <div className="p-6">
            {/* Error State */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
                <p className="text-destructive font-medium">Erro</p>
                <p className="text-destructive text-sm mt-1">{error}</p>
              </div>
            )}

            {/* Status Info */}
            {!error && (
              <div className="mb-6 pb-6 border-b border-border">
                <p className="text-sm text-muted-foreground">
                  {isLoading
                    ? 'Carregando datas especiais...'
                    : `Mostrando ${clients.length} cliente${clients.length === 1 ? '' : 's'} com datas especiais`}
                </p>
              </div>
            )}

            {/* Special Dates List */}
            <SpecialDatesList clients={clients} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  )
}
