'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Search, Loader2, X, UserCheck } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { fetchClients } from '@/lib/clients'
import { Client } from '@/types/client'

interface ClienteSelectorProps {
  selectedClient: { id: string; nome: string; telefone?: string } | null
  onSelect: (client: { id: string; nome: string; telefone?: string }) => void
  onClear: () => void
}

export function ClienteSelector({ selectedClient, onSelect, onClear }: ClienteSelectorProps) {
  const [searchInput, setSearchInput] = useState('')
  const [results, setResults] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const debouncedSearch = useDebounce(searchInput, 300)

  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setResults([])
      return
    }

    const search = async () => {
      setLoading(true)
      try {
        const response = await fetchClients({ searchQuery: debouncedSearch, limit: 10 })
        setResults(response.clients)
        setShowResults(true)
      } catch (error) {
        console.error('Erro ao buscar clientes:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    search()
  }, [debouncedSearch])

  const handleSelect = (client: Client) => {
    const phone = client.contactMethods?.find(
      (cm) => cm.type === 'phone' || cm.type === 'whatsapp'
    )?.value

    onSelect({
      id: client.id,
      nome: client.name,
      telefone: phone,
    })
    setSearchInput('')
    setShowResults(false)
    setResults([])
  }

  if (selectedClient) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
        <UserCheck className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{selectedClient.nome}</p>
          {selectedClient.telefone && (
            <p className="text-xs text-muted-foreground">{selectedClient.telefone}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar cliente por nome, email ou telefone..."
          className="pl-10"
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showResults && results.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto shadow-lg">
          {results.map((client) => {
            const phone = client.contactMethods?.find(
              (cm) => cm.type === 'phone' || cm.type === 'whatsapp'
            )?.value

            return (
              <button
                key={client.id}
                type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(client)
                }}
              >
                <p className="font-medium text-sm">{client.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[phone, client.email].filter(Boolean).join(' | ')}
                </p>
              </button>
            )
          })}
        </Card>
      )}

      {showResults && debouncedSearch.length >= 2 && results.length === 0 && !loading && (
        <Card className="absolute z-50 w-full mt-1 shadow-lg">
          <p className="px-4 py-3 text-sm text-muted-foreground">
            Nenhum cliente encontrado
          </p>
        </Card>
      )}
    </div>
  )
}
