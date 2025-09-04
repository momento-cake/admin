'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserInvitation } from '@/types'
import { isInvitationExpired } from '@/lib/invitations'
import { Mail, RefreshCw, X, Clock, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function InvitationsList() {
  const [invitations, setInvitations] = useState<UserInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchInvitations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/invitations')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar convites')
      }

      const data = await response.json()
      setInvitations(data.invitations || [])
      setError(null)
    } catch (error) {
      console.error('Error fetching invitations:', error)
      setError(error instanceof Error ? error.message : 'Erro interno do servidor')
    } finally {
      setIsLoading(false)
    }
  }

  const updateInvitationStatus = async (id: string, status: 'cancelled') => {
    try {
      setProcessingId(id)
      const response = await fetch(`/api/invitations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar convite')
      }

      // Refresh the list
      await fetchInvitations()
    } catch (error) {
      console.error('Error updating invitation:', error)
      setError(error instanceof Error ? error.message : 'Erro interno do servidor')
    } finally {
      setProcessingId(null)
    }
  }

  useEffect(() => {
    fetchInvitations()
  }, [])

  const getStatusIcon = (status: string, expiresAt: Date) => {
    if (status === 'pending' && isInvitationExpired(expiresAt)) {
      return <XCircle className="h-4 w-4 text-red-500" />
    }

    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <X className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string, expiresAt: Date) => {
    const isExpired = status === 'pending' && isInvitationExpired(expiresAt)
    const displayStatus = isExpired ? 'expired' : status
    
    const statusText = {
      pending: 'Pendente',
      accepted: 'Aceito',
      expired: 'Expirado',
      cancelled: 'Cancelado'
    }

    const variant = getStatusColorInternal(displayStatus)

    return (
      <Badge variant={variant as "default" | "destructive" | "outline" | "secondary"}>
        {statusText[displayStatus as keyof typeof statusText]}
      </Badge>
    )
  }

  const getStatusColorInternal = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default'
      case 'accepted':
        return 'secondary'
      case 'expired':
        return 'destructive'
      case 'cancelled':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando convites...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (invitations.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        title="Nenhum convite encontrado"
        description="Quando você enviar convites para usuários, eles aparecerão aqui"
        action={{
          label: "Atualizar Lista",
          onClick: fetchInvitations
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {invitations.length} convite{invitations.length !== 1 ? 's' : ''} encontrado{invitations.length !== 1 ? 's' : ''}
        </p>
        <Button variant="outline" size="sm" onClick={fetchInvitations}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data do Convite</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell className="font-medium">
                  {invitation.name}
                </TableCell>
                <TableCell>{invitation.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {invitation.role === 'admin' ? 'Administrador' : 'Visualizador'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(invitation.status, invitation.expiresAt)}
                    {getStatusBadge(invitation.status, invitation.expiresAt)}
                  </div>
                </TableCell>
                <TableCell>
                  {format(invitation.invitedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <span className={`${isInvitationExpired(invitation.expiresAt) ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {format(invitation.expiresAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {invitation.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateInvitationStatus(invitation.id, 'cancelled')}
                      disabled={processingId === invitation.id}
                    >
                      {processingId === invitation.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Cancelar
                        </>
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

