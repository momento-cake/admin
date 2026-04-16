'use client'

import { Calendar, Lock, Globe } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface DetalhesStepProps {
  dataEntrega: string
  onDataEntregaChange: (date: string) => void
  observacoes: string
  onObservacoesChange: (text: string) => void
  observacoesCliente: string
  onObservacoesClienteChange: (text: string) => void
}

export function DetalhesStep({
  dataEntrega,
  onDataEntregaChange,
  observacoes,
  onObservacoesChange,
  observacoesCliente,
  onObservacoesClienteChange,
}: DetalhesStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Detalhes do Pedido</h3>
        <p className="text-sm text-muted-foreground">
          Defina a data de entrega e adicione observações
        </p>
      </div>

      {/* Delivery date */}
      <div className="space-y-2">
        <Label htmlFor="dataEntrega" className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Data de Entrega/Retirada
        </Label>
        <Input
          id="dataEntrega"
          type="date"
          value={dataEntrega}
          onChange={(e) => onDataEntregaChange(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Internal notes */}
      <div className="space-y-2">
        <Label htmlFor="observacoes" className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          Observações Internas
        </Label>
        <p className="text-xs text-muted-foreground -mt-1">
          Notas visíveis apenas para a equipe
        </p>
        <Textarea
          id="observacoes"
          value={observacoes}
          onChange={(e) => onObservacoesChange(e.target.value)}
          placeholder="Notas internas sobre o pedido (não visível para o cliente)"
          rows={3}
        />
      </div>

      {/* Client notes */}
      <div className="space-y-2">
        <Label htmlFor="observacoesCliente" className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          Observações para o Cliente
        </Label>
        <p className="text-xs text-muted-foreground -mt-1">
          Visível na página pública do pedido
        </p>
        <Textarea
          id="observacoesCliente"
          value={observacoesCliente}
          onChange={(e) => onObservacoesClienteChange(e.target.value)}
          placeholder="Notas visíveis na página pública do pedido"
          rows={3}
        />
      </div>
    </div>
  )
}
