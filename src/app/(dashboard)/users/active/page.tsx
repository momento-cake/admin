'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus } from 'lucide-react'
import { InviteUserDialog } from '@/components/users/InviteUserDialog'
import { UsersList } from '@/components/users/UsersList'

export default function ActiveUsersPage() {
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuários Ativos</h1>
          <p className="text-muted-foreground">
            Lista de todos os usuários ativos no sistema
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
            <CardTitle>Usuários do Sistema</CardTitle>
            <CardDescription>
              Gerencie os usuários ativos e suas permissões
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsersList />
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