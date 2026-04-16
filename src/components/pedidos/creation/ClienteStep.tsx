'use client'

import { UserCheck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ClienteSelector } from '@/components/pedidos/ClienteSelector'

interface ClienteStepProps {
  selectedClient: { id: string; nome: string; telefone?: string } | null
  onSelect: (client: { id: string; nome: string; telefone?: string }) => void
  onClear: () => void
}

export function ClienteStep({ selectedClient, onSelect, onClear }: ClienteStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Cliente</h3>
        <p className="text-sm text-muted-foreground">
          Selecione o cliente para este pedido
        </p>
      </div>

      {selectedClient ? (
        <Card className="border-green-500/50 bg-green-50/30">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex-shrink-0 rounded-full bg-primary/10 p-3">
              <UserCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold">{selectedClient.nome}</p>
              {selectedClient.telefone && (
                <p className="text-sm text-muted-foreground">{selectedClient.telefone}</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={onClear}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Alterar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ClienteSelector
          selectedClient={selectedClient}
          onSelect={onSelect}
          onClear={onClear}
        />
      )}
    </div>
  )
}
