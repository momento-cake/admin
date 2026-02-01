'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Dynamically import the folders content with SSR disabled to prevent hydration errors
const FoldersContent = dynamic(
  () => import('@/components/folders/FoldersContent'),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pastas</h1>
            <p className="text-muted-foreground">
              Organize suas imagens em pastas para compartilhar com clientes.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }
)

export default function FoldersPage() {
  return <FoldersContent />
}
