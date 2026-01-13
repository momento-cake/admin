'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'
import { Loader2, Send } from 'lucide-react'

const inviteSchema = z.object({
  email: z.string().email('Digite um email valido'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  role: z.enum(['admin', 'atendente'] as const),
  department: z.string().optional(),
  notes: z.string().optional(),
})

type InviteFormData = z.infer<typeof inviteSchema>

interface InviteUserDialogProps {
  open: boolean
  onClose: () => void
}

export function InviteUserDialog({ open, onClose }: InviteUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { user } = useAuth()

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      name: '',
      role: 'atendente',
      department: '',
      notes: '',
    },
  })

  const onSubmit = async (data: InviteFormData) => {
    if (!user?.uid) {
      setError('Você precisa estar logado para enviar convites')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          invitedBy: user.uid,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao enviar convite')
      }

      await response.json()
      setSuccess('Convite enviado com sucesso!')
      
      // Reset form after success
      form.reset()
      
      // Close dialog after a short delay
      setTimeout(() => {
        onClose()
        setSuccess(null)
      }, 2000)

    } catch (error) {
      console.error('Error sending invitation:', error)
      setError(error instanceof Error ? error.message : 'Erro interno do servidor')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    form.reset()
    setError(null)
    setSuccess(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Usuário</DialogTitle>
          <DialogDescription>
            Envie um convite para que alguém se registre na plataforma
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@exemplo.com"
              {...form.register('email')}
              disabled={isLoading}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              placeholder="João Silva"
              {...form.register('name')}
              disabled={isLoading}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Funcao *</Label>
            <Select onValueChange={(value) => form.setValue('role', value as UserRole)} defaultValue="atendente">
              <SelectTrigger disabled={isLoading}>
                <SelectValue placeholder="Selecione uma funcao" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="atendente">Atendente</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.role && (
              <p className="text-sm text-red-600">{form.formState.errors.role.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Departamento</Label>
            <Input
              id="department"
              placeholder="Vendas, Marketing, etc."
              {...form.register('department')}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Informações adicionais sobre o convite..."
              {...form.register('notes')}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Convite
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}