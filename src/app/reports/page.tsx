'use client'

import { EmptyState } from '@/components/ui/empty-state'
import { BarChart3 } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground">
          Visualize dados e métricas do seu negócio
        </p>
      </div>

      <EmptyState
        icon={BarChart3}
        title="Sem dados suficientes"
        description="Cadastre clientes, ingredientes e receitas para gerar relatórios detalhados"
        action={{
          label: "Ir para Dashboard",
          href: "/dashboard"
        }}
      />
    </div>
  )
}