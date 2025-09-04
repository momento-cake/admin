'use client'

import { EmptyState } from '@/components/ui/empty-state'
import { ChefHat } from 'lucide-react'

export default function RecipesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Receitas</h1>
        <p className="text-muted-foreground">
          Crie e gerencie suas receitas com custos e instruções
        </p>
      </div>

      <EmptyState
        icon={ChefHat}
        title="Nenhuma receita cadastrada"
        description="Crie receitas usando seus ingredientes para calcular custos e gerenciar produção"
        action={{
          label: "Criar Receita",
          onClick: () => {
            // TODO: Implement add recipe functionality
            console.log('Add recipe clicked')
          }
        }}
      />
    </div>
  )
}