'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Edit2, Trash2, MapPin, Loader2, Store } from 'lucide-react'
import { StoreAddress } from '@/types/store-settings'
import { StoreAddressForm } from './StoreAddressForm'
import { useAuth } from '@/hooks/useAuth'
import { formatErrorMessage } from '@/lib/error-handler'

export function StoreAddressList() {
  const { userModel } = useAuth()
  const [addresses, setAddresses] = useState<StoreAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<StoreAddress | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const loadAddresses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/store-addresses')
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Erro ao carregar endereços')
      setAddresses(result.data)
    } catch (error) {
      toast.error('Erro ao carregar endereços', {
        description: formatErrorMessage(error),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAddresses()
  }, [])

  const handleSave = async (data: {
    nome: string
    cep?: string
    estado?: string
    cidade?: string
    bairro?: string
    endereco?: string
    numero?: string
    complemento?: string
    isDefault: boolean
  }) => {
    setIsSaving(true)
    try {
      if (editingAddress) {
        const response = await fetch(`/api/store-addresses/${editingAddress.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const result = await response.json()
        if (!result.success) throw new Error(result.error || 'Erro ao atualizar endereço')
        toast.success('Endereço atualizado com sucesso!')
      } else {
        const isFirstAddress = addresses.length === 0
        const response = await fetch('/api/store-addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            isDefault: isFirstAddress ? true : data.isDefault,
          }),
        })
        const result = await response.json()
        if (!result.success) throw new Error(result.error || 'Erro ao criar endereço')
        toast.success('Endereço adicionado com sucesso!')
      }
      setShowForm(false)
      setEditingAddress(null)
      await loadAddresses()
    } catch (error) {
      toast.error('Erro ao salvar endereço', {
        description: formatErrorMessage(error),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return

    try {
      const response = await fetch(`/api/store-addresses/${deletingId}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Erro ao remover endereço')
      toast.success('Endereço removido com sucesso!')
      setDeletingId(null)
      await loadAddresses()
    } catch (error) {
      toast.error('Erro ao remover endereço', {
        description: formatErrorMessage(error),
      })
    }
  }

  const handleEdit = (address: StoreAddress) => {
    setEditingAddress(address)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingAddress(null)
  }

  const formatAddressDisplay = (addr: StoreAddress) => {
    const lineOne: string[] = []
    if (addr.endereco) {
      let street = addr.endereco
      if (addr.numero) street += ', ' + addr.numero
      lineOne.push(street)
    }
    if (addr.complemento) lineOne.push(addr.complemento)

    const lineTwo: string[] = []
    if (addr.bairro) lineTwo.push(addr.bairro)
    const cityState = [addr.cidade, addr.estado].filter(Boolean).join(' - ')
    if (cityState) lineTwo.push(cityState)
    if (addr.cep) lineTwo.push('CEP ' + addr.cep)

    return { lineOne: lineOne.join(', '), lineTwo: lineTwo.join(' · ') }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!showForm && addresses.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Endereço
          </Button>
        </div>
      )}

      {showForm && (
        <StoreAddressForm
          address={editingAddress}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      )}

      {!showForm && addresses.length === 0 && (
        <Card className="p-10 text-center border-dashed">
          <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Store className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Nenhum endereço cadastrado
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5 mb-5 max-w-md mx-auto">
            Adicione o primeiro endereço da loja para habilitar a opção de retirada no fluxo de pedidos.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Endereço
          </Button>
        </Card>
      )}

      {!showForm && addresses.length > 0 && (
        <div className="grid gap-3">
          {addresses.map((addr) => {
            const { lineOne, lineTwo } = formatAddressDisplay(addr)
            return (
              <Card
                key={addr.id}
                className="relative p-5 transition hover:border-primary/30 hover:shadow-sm"
              >
                {addr.isDefault && (
                  <Badge
                    variant="secondary"
                    className="absolute top-3 right-3"
                  >
                    Padrão
                  </Badge>
                )}

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <MapPin className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0 pr-16">
                    <p className="font-medium text-foreground truncate">
                      {addr.nome}
                    </p>
                    {lineOne ? (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {lineOne}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground/70 italic mt-0.5">
                        Endereço incompleto
                      </p>
                    )}
                    {lineTwo && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {lineTwo}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 mt-4 pt-3 border-t justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(addr)}
                  >
                    <Edit2 className="h-4 w-4 mr-1.5" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingId(addr.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Remover
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Endereço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este endereço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
