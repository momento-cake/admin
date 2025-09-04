'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserModel } from '@/types'
import { Users, RefreshCw, CheckCircle, XCircle, Shield, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export function UsersList() {
  const [users, setUsers] = useState<UserModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      )
      
      const querySnapshot = await getDocs(usersQuery)
      const fetchedUsers: UserModel[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        fetchedUsers.push({
          uid: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          lastSignInAt: data.lastSignInAt?.toDate(),
        } as UserModel)
      })

      setUsers(fetchedUsers)
      setError(null)
    } catch (error) {
      console.error('Error fetching users:', error)
      setError(error instanceof Error ? error.message : 'Erro interno do servidor')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const getRoleIcon = (role: string) => {
    return role === 'admin' ? (
      <Shield className="h-4 w-4 text-blue-500" />
    ) : (
      <Eye className="h-4 w-4 text-gray-500" />
    )
  }

  const getRoleBadge = (role: string) => {
    return (
      <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
        {role === 'admin' ? 'Administrador' : 'Visualizador'}
      </Badge>
    )
  }

  const getInitials = (displayName?: string, email?: string) => {
    if (displayName) {
      const names = displayName.split(' ')
      return names.length > 1 
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : displayName.substring(0, 2).toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando usuários...</span>
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

  if (users.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Nenhum usuário encontrado"
        description="Não há usuários cadastrados no sistema ainda"
        action={{
          label: "Atualizar Lista",
          onClick: fetchUsers
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {users.length} usuário{users.length !== 1 ? 's' : ''} encontrado{users.length !== 1 ? 's' : ''}
        </p>
        <Button variant="outline" size="sm" onClick={fetchUsers}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead>Último Acesso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL} alt={user.displayName} />
                      <AvatarFallback>
                        {getInitials(user.displayName, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.displayName || 'Sem nome'}</p>
                      {user.metadata?.department && (
                        <p className="text-sm text-muted-foreground">
                          {user.metadata.department}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getRoleIcon(user.role.type)}
                    {getRoleBadge(user.role.type)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {user.isActive ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Badge variant="secondary">Ativo</Badge>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <Badge variant="destructive">Inativo</Badge>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {user.createdAt && format(user.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  {user.lastSignInAt 
                    ? format(user.lastSignInAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : 'Nunca'
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}