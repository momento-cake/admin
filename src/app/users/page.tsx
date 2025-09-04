'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserPlus } from 'lucide-react'
import { InviteUserDialog } from '@/components/users/InviteUserDialog'
import { InvitationsList } from '@/components/users/InvitationsList'
import { UsersList } from '@/components/users/UsersList'

export default function UsersPage() {
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários do sistema e envie convites
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Convidar Usuário
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Usuários Ativos</TabsTrigger>
          <TabsTrigger value="invitations">Convites</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Usuários do Sistema</CardTitle>
              <CardDescription>
                Lista de todos os usuários ativos no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersList />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="invitations">
          <Card>
            <CardHeader>
              <CardTitle>Convites Enviados</CardTitle>
              <CardDescription>
                Gerencie os convites pendentes, aceitos e expirados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvitationsList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InviteUserDialog 
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
      />
    </div>
  )
}