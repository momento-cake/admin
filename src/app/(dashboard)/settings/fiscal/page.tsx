'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { FiscalSettings } from '@/components/settings/FiscalSettings'

export default function FiscalPage() {
  const { isAdmin } = usePermissions()

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configuração Fiscal</h1>
          <p className="text-muted-foreground">Acesso restrito a administradores</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link href="/settings" className="hover:text-foreground">Configurações</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Fiscal / NF-e</span>
        </nav>
        <h1 className="text-3xl font-bold text-foreground">Configuração Fiscal</h1>
        <p className="text-muted-foreground">
          Configure a emissão de NF-e e NFC-e: ambiente SEFAZ, perfil tributário, CSC e certificado A1
        </p>
      </div>

      <FiscalSettings />
    </div>
  )
}
