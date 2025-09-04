'use client'

import { EmptyState } from '@/components/ui/empty-state'
import { ShoppingBag } from 'lucide-react'

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
        <p className="text-muted-foreground">
          Gerencie seus clientes e suas informações
        </p>
      </div>

      <EmptyState
        icon={ShoppingBag}
        title="Nenhum cliente cadastrado"
        description="Comece adicionando seu primeiro cliente para gerenciar pedidos e informações de contato"
        action={{
          label: "Adicionar Cliente",
          onClick: () => {
            // TODO: Implement add client functionality
            console.log('Add client clicked')
          }
        }}
      />
    </div>
  )
}