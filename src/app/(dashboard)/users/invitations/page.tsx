'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus } from 'lucide-react'
import { InviteUserDialog } from '@/components/users/InviteUserDialog'
import { InvitationsList } from '@/components/users/InvitationsList'

export default function InvitationsPage() {
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Convites</h1>
          <p className="text-muted-foreground">
            Gerencie os convites pendentes, aceitos e expirados
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Convidar Usuário
        </Button>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Convites Enviados</CardTitle>
            <CardDescription>
              Acompanhe o status dos convites enviados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvitationsList />
          </CardContent>
        </Card>
      </div>

      <InviteUserDialog 
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
      />
    </div>
  )
}