'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, ArrowLeft, Save } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { Pedido, UpdatePedidoData } from '@/types/pedido'
import { formatErrorMessage } from '@/lib/error-handler'
import { updatePedido } from '@/lib/pedidos'
import { useAuthContext } from '@/contexts/AuthContext'
import { ClienteSelector } from '@/components/pedidos/ClienteSelector'

export default function EditOrderPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthContext()

  const pedidoId = params.id as string

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [selectedClient, setSelectedClient] = useState<{
    id: string
    nome: string
    telefone?: string
  } | null>(null)
  const [entregaTipo, setEntregaTipo] = useState<'ENTREGA' | 'RETIRADA'>('RETIRADA')
  const [dataEntrega, setDataEntrega] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [observacoesCliente, setObservacoesCliente] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/pedidos/${pedidoId}`)
        const json = await response.json()
        if (!json.success) throw new Error(json.error || 'Erro ao carregar pedido')
        const result = json.data as Pedido

        setPedido(result)

        // Populate form
        setSelectedClient({
          id: result.clienteId,
          nome: result.clienteNome,
          telefone: result.clienteTelefone,
        })
        setEntregaTipo(result.entrega.tipo)
        if (result.dataEntrega) {
          let date: Date
          if ((result.dataEntrega as any).toDate) {
            date = (result.dataEntrega as any).toDate()
          } else if ((result.dataEntrega as any)._seconds) {
            date = new Date((result.dataEntrega as any)._seconds * 1000)
          } else {
            date = new Date(result.dataEntrega as any)
          }
          setDataEntrega(date.toISOString().split('T')[0])
        }
        setObservacoes(result.observacoes || '')
        setObservacoesCliente(result.observacoesCliente || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar pedido')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [pedidoId])

  const handleSave = async () => {
    if (!selectedClient) {
      toast.error('Selecione um cliente')
      return
    }

    setSaving(true)
    try {
      const updateData: UpdatePedidoData = {
        clienteId: selectedClient.id,
        clienteNome: selectedClient.nome,
        clienteTelefone: selectedClient.telefone,
        entrega: {
          ...pedido!.entrega,
          tipo: entregaTipo,
        },
        dataEntrega: dataEntrega
          ? Timestamp.fromDate(new Date(dataEntrega))
          : null,
        observacoes: observacoes || undefined,
        observacoesCliente: observacoesCliente || undefined,
      }

      await updatePedido(pedidoId, updateData, user?.uid || '')

      toast.success('Pedido atualizado com sucesso!')
      router.push(`/orders/${pedidoId}`)
    } catch (err) {
      toast.error('Erro ao atualizar pedido', {
        description: formatErrorMessage(err),
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando pedido...</span>
      </div>
    )
  }

  if (error || !pedido) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error || 'Pedido não encontrado'}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href={`/orders/${pedidoId}`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar para Detalhes
        </Link>
        <h1 className="text-3xl font-bold">Editar Pedido {pedido.numeroPedido}</h1>
        <p className="text-muted-foreground">
          Atualize as informações do pedido
        </p>
      </div>

      {/* Client */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClienteSelector
            selectedClient={selectedClient}
            onSelect={setSelectedClient}
            onClear={() => setSelectedClient(null)}
          />
        </CardContent>
      </Card>

      {/* Delivery/Pickup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Entrega / Retirada</CardTitle>
        </CardHeader>
        <CardContent>
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
              placeholder="Notas internas sobre o pedido"
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
              placeholder="Notas visíveis na página pública"
              rows={3}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => router.push(`/orders/${pedidoId}`)}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving || !selectedClient}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
