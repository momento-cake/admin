'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { StoreAddressList } from '@/components/settings/StoreAddressList'

export default function StoreAddressesPage() {
  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link href="/settings" className="hover:text-foreground">Configurações</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Endereços da Loja</span>
        </nav>
        <h1 className="text-3xl font-bold text-foreground">Endereços da Loja</h1>
        <p className="text-muted-foreground">
          Gerencie os endereços das lojas para retirada de pedidos
        </p>
      </div>

      <StoreAddressList />
    </div>
  )
}
