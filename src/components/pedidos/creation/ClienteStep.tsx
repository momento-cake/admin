'use client'

import { useState } from 'react'
import { UserCheck, RefreshCw, UserPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ClienteSelector } from '@/components/pedidos/ClienteSelector'
import { toast } from 'sonner'

interface ClienteStepProps {
  selectedClient: { id: string; nome: string; telefone?: string } | null
  onSelect: (client: { id: string; nome: string; telefone?: string }) => void
  onClear: () => void
}

export function ClienteStep({ selectedClient, onSelect, onClear }: ClienteStepProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Quick-create form fields
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const resetForm = () => {
    setNewName('')
    setNewPhone('')
    setNewEmail('')
    setFormError(null)
  }

  const handleOpenDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleCreateClient = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      setFormError('Nome e telefone são obrigatórios.')
      return
    }

    setCreating(true)
    setFormError(null)

    try {
      const payload: Record<string, unknown> = {
        type: 'person',
        name: newName.trim(),
        contactMethods: [
          {
            id: '1',
            type: 'phone',
            value: newPhone.trim(),
            isPrimary: true,
          },
        ],
      }

      if (newEmail.trim()) {
        payload.email = newEmail.trim()
      }

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar cliente')
      }

      // Auto-select the newly created client
      onSelect({
        id: result.data.id,
        nome: result.data.name,
        telefone: newPhone.trim(),
      })

      toast.success('Cliente criado com sucesso!', {
        description: result.data.name,
      })

      setDialogOpen(false)
      resetForm()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar cliente'
      setFormError(message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Cliente</h3>
        <p className="text-sm text-muted-foreground">
          Selecione o cliente para este pedido
        </p>
      </div>

      {selectedClient ? (
        <Card className="border-green-500/50 bg-green-50/30">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex-shrink-0 rounded-full bg-primary/10 p-3">
              <UserCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold">{selectedClient.nome}</p>
              {selectedClient.telefone && (
                <p className="text-sm text-muted-foreground">{selectedClient.telefone}</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={onClear}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Alterar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <ClienteSelector
            selectedClient={selectedClient}
            onSelect={onSelect}
            onClear={onClear}
            onCreateNew={handleOpenDialog}
          />
          <Button variant="outline" size="sm" onClick={handleOpenDialog}>
            <UserPlus className="h-4 w-4 mr-2" />
            Cadastrar novo cliente
          </Button>
        </>
      )}

      {/* Quick-create client dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar novo cliente</DialogTitle>
            <DialogDescription>
              Preencha os dados básicos para criar o cliente rapidamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="quick-name">Nome *</Label>
              <Input
                id="quick-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do cliente"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-phone">Telefone *</Label>
              <Input
                id="quick-phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="11999999999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-email">Email (opcional)</Label>
              <Input
                id="quick-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="cliente@email.com"
              />
            </div>

            {formError && (
              <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateClient}
              disabled={creating || !newName.trim() || !newPhone.trim()}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar Cliente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
