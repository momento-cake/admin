'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { StoreHoursEditor } from '@/components/settings/StoreHoursEditor'

export default function StoreHoursPage() {
  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link href="/settings" className="hover:text-foreground">Configurações</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Horários</span>
        </nav>
        <h1 className="text-3xl font-bold text-foreground">Horários de Funcionamento</h1>
        <p className="text-muted-foreground">
          Configure os horários de funcionamento da loja para cada dia da semana
        </p>
      </div>

      <StoreHoursEditor />
    </div>
  )
}
