'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { FreightSettings } from '@/components/settings/FreightSettings'

export default function FreightPage() {
  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link href="/settings" className="hover:text-foreground">Configurações</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Frete</span>
        </nav>
        <h1 className="text-3xl font-bold text-foreground">Configuração de Frete</h1>
        <p className="text-muted-foreground">
          Configure o custo por quilômetro para cálculo de entregas
        </p>
      </div>

      <FreightSettings />
    </div>
  )
}
