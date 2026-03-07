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
import { Plus, Edit2, Trash2, MapPin, Loader2 } from 'lucide-react'
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
        // If this is the first address, force it as default
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
    const parts = []
    if (addr.endereco) {
      let street = addr.endereco
      if (addr.numero) street += ', ' + addr.numero
      parts.push(street)
    }
    if (addr.complemento) parts.push(addr.complemento)
    if (addr.bairro) parts.push(addr.bairro)
    const cityState = [addr.cidade, addr.estado].filter(Boolean).join(' - ')
    if (cityState) parts.push(cityState)
    if (addr.cep) parts.push('CEP: ' + addr.cep)
    return parts.join(', ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!showForm && (
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
        <Card className="p-8 text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">
            Nenhum endereço cadastrado
          </p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Adicione o primeiro endereço da loja para habilitar retirada nos pedidos.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Endereço
          </Button>
        </Card>
      )}

      {!showForm && addresses.length > 0 && (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <Card key={addr.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium">{addr.nome}</span>
                    {addr.isDefault && (
                      <Badge variant="secondary">Padrão</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {formatAddressDisplay(addr) || 'Endereço incompleto'}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(addr)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingId(addr.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
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
