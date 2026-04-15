'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save } from 'lucide-react'
import { PedidoItem, PedidoEntrega } from '@/types/pedido'
import { formatErrorMessage } from '@/lib/error-handler'
import { ClienteSelector } from './ClienteSelector'
import { PedidoItemsTable } from './PedidoItemsTable'

interface PedidoFormProps {
  mode?: 'create' | 'edit'
}

export function PedidoForm({ mode = 'create' }: PedidoFormProps) {
  const router = useRouter()

  // Client
  const [selectedClient, setSelectedClient] = useState<{
    id: string
    nome: string
    telefone?: string
  } | null>(null)

  // Items
  const [items, setItems] = useState<PedidoItem[]>([])

  // Delivery
  const [entregaTipo, setEntregaTipo] = useState<'ENTREGA' | 'RETIRADA'>('RETIRADA')

  // Dates & notes
  const [dataEntrega, setDataEntrega] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [observacoesCliente, setObservacoesCliente] = useState('')

  // State
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ client?: string; items?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSave = async () => {
    const newErrors: { client?: string; items?: string } = {}

    if (!selectedClient) {
      newErrors.client = 'Selecione um cliente'
    }
    if (items.length === 0) {
      newErrors.items = 'Adicione pelo menos um item ao pedido'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setSubmitError(null)

    // After validation, selectedClient is guaranteed non-null
    const client = selectedClient!

    setSaving(true)
    try {
      // Freight (custoPorKm, address, distance) is configured later via
      // FreteCalculator on the order detail page. Don't fetch store settings
      // at create time — it requires settings:view which non-admin roles
      // don't have, and would fail the submit with a silent 403.
      const entrega: PedidoEntrega = {
        tipo: entregaTipo,
        custoPorKm: 0,
        taxaExtra: 0,
        freteTotal: 0,
      }

      const pedidoData = {
        clienteId: client.id,
        clienteNome: client.nome,
        clienteTelefone: client.telefone,
        entrega,
        orcamentos: [
          {
            itens: items,
            desconto: 0,
            descontoTipo: 'valor',
            acrescimo: 0,
          },
        ],
        dataEntrega: dataEntrega ? new Date(dataEntrega).toISOString() : undefined,
        observacoes: observacoes || undefined,
        observacoesCliente: observacoesCliente || undefined,
      }

      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedidoData),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      toast.success('Pedido criado com sucesso!', {
        description: `Pedido ${result.data.numeroPedido} criado`,
      })

      router.push('/orders')
    } catch (error) {
      const message = formatErrorMessage(error)
      setSubmitError(message)
      toast.error('Erro ao criar pedido', {
        description: message,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Client selection */}
      <Card className={errors.client ? 'border-red-500' : ''}>
        <CardHeader>
          <CardTitle className="text-lg">Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div aria-required="true">
            <ClienteSelector
              selectedClient={selectedClient}
              onSelect={(c) => { setSelectedClient(c); setErrors((e) => ({ ...e, client: undefined })) }}
              onClear={() => setSelectedClient(null)}
            />
          </div>
          {errors.client && (
            <p className="text-xs text-red-500 mt-1">{errors.client}</p>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card className={errors.items ? 'border-red-500' : ''}>
        <CardHeader>
          <CardTitle className="text-lg">Itens do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div aria-required="true">
            <PedidoItemsTable items={items} onChange={(newItems) => { setItems(newItems); if (newItems.length > 0) setErrors((e) => ({ ...e, items: undefined })) }} />
          </div>
          {errors.items && (
            <p className="text-xs text-red-500 mt-1">{errors.items}</p>
          )}
        </CardContent>
      </Card>

      {/* Delivery/Pickup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Entrega / Retirada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select
                value={entregaTipo}
                onValueChange={(v) => setEntregaTipo(v as 'ENTREGA' | 'RETIRADA')}
              >
                <SelectTrigger className="w-full max-w-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RETIRADA">Retirada na Loja</SelectItem>
                  <SelectItem value="ENTREGA">Entrega</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {entregaTipo === 'ENTREGA' && (
              <p className="text-sm text-muted-foreground">
                Configure o endereço de entrega e frete após criar o pedido.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dates & Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datas e Observações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="dataEntrega">Data de Entrega/Retirada</Label>
            <Input
              id="dataEntrega"
              type="date"
              value={dataEntrega}
              onChange={(e) => setDataEntrega(e.target.value)}
              className="max-w-xs mt-1"
            />
          </div>

          <div>
            <Label htmlFor="observacoes">Observações Internas</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas internas sobre o pedido (não visível para o cliente)"
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="observacoesCliente">Observações para o Cliente</Label>
            <Textarea
              id="observacoesCliente"
              value={observacoesCliente}
              onChange={(e) => setObservacoesCliente(e.target.value)}
              placeholder="Notas visíveis na página pública do pedido"
              rows={3}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inline submit error (visible even when toasts are hidden) */}
      {submitError && (
        <div
          role="alert"
          className="rounded-md border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <p className="font-medium">Erro ao criar pedido</p>
          <p className="mt-1">{submitError}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => router.push('/orders')} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving || !selectedClient || items.length === 0}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Criar Pedido
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
