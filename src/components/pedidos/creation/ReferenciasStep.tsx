'use client'

import { ReferenciaImagesEditor } from '@/components/pedidos/ReferenciaImagesEditor'
import type { PedidoImagemReferenciaInput } from '@/types/pedido'

interface ReferenciasStepProps {
  value: PedidoImagemReferenciaInput[]
  onChange: (next: PedidoImagemReferenciaInput[]) => void
}

export function ReferenciasStep({ value, onChange }: ReferenciasStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Imagens de Referência</h3>
        <p className="text-sm text-muted-foreground">
          Imagens aprovadas pelo cliente (opcional). Adicione quantas precisar.
        </p>
      </div>
      <ReferenciaImagesEditor value={value} onChange={onChange} />
    </div>
  )
}
