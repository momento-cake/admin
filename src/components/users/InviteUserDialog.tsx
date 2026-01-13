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
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'

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

// Generate a random token using Web Crypto API (works in browser)
function generateInvitationToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
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
      const email = data.email.toLowerCase()

      // Check if invitation already exists for this email
      const existingInvitationsRef = collection(db, 'invitations')
      const existingQuery = query(
        existingInvitationsRef,
        where('email', '==', email),
        where('status', 'in', ['pending'])
      )

      const existingSnapshot = await getDocs(existingQuery)
      if (!existingSnapshot.empty) {
        throw new Error('Já existe um convite pendente para este email')
      }

      // Generate invitation token and expiration
      const token = generateInvitationToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

      // Create invitation document directly in Firestore
      const invitationData = {
        email,
        name: data.name,
        role: data.role,
        status: 'pending' as const,
        token,
        invitedBy: user.uid,
        invitedAt: serverTimestamp(),
        expiresAt,
        metadata: {
          department: data.department || '',
          notes: data.notes || ''
        }
      }

      const invitationsRef = collection(db, 'invitations')
      await addDoc(invitationsRef, invitationData)

      // Log invitation URL for development (email sending not implemented yet)
      const inviteUrl = `${window.location.origin}/register?token=${token}`
      console.log('=== INVITATION CREATED ===')
      console.log('Email:', email)
      console.log('Name:', data.name)
      console.log('Role:', data.role)
      console.log('Invitation URL:', inviteUrl)
      console.log('========================')

      setSuccess('Convite criado com sucesso!')

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