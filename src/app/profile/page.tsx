'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { updateProfile, updatePassword } from 'firebase/auth'
import { db } from '@/lib/firebase'
import { Loader2, Save, Key, User, Shield, Eye } from 'lucide-react'

const profileSchema = z.object({
  displayName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().optional(),
  department: z.string().optional(),
  bio: z.string().max(500, 'Bio deve ter no máximo 500 caracteres').optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { user } = useAuth()
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [isLoadingPassword, setIsLoadingPassword] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<{
    role?: { type: string }
    metadata?: {
      firstName?: string
      lastName?: string
      phone?: string
      department?: string
      bio?: string
      registeredFrom?: string
      invitationId?: string
    }
  } | null>(null)

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      phone: '',
      department: '',
      bio: '',
    },
  })

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const fetchUserDetails = useCallback(async () => {
    if (!user) return

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setUserDetails(userData)
        
        // Pre-fill form with existing data
        profileForm.setValue('displayName', user.displayName || '')
        profileForm.setValue('phone', userData.metadata?.phone || '')
        profileForm.setValue('department', userData.metadata?.department || '')
        profileForm.setValue('bio', userData.metadata?.bio || '')
      }
    } catch (error) {
      console.error('Error fetching user details:', error)
    }
  }, [user, profileForm])

  useEffect(() => {
    if (user) {
      fetchUserDetails()
    }
  }, [user, fetchUserDetails])

  // Return early if not authenticated (middleware should catch this)
  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando perfil...</span>
      </div>
    )
  }

  const onSubmitProfile = async (data: ProfileFormData) => {
    if (!user) return

    setIsLoadingProfile(true)
    setProfileError(null)
    setProfileSuccess(null)

    try {
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: data.displayName
      })

      // Update Firestore user document
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: data.displayName,
        'metadata.phone': data.phone || '',
        'metadata.department': data.department || '',
        'metadata.bio': data.bio || '',
        updatedAt: new Date(),
      })

      setProfileSuccess('Perfil atualizado com sucesso!')
      
      // Refresh user details
      await fetchUserDetails()

    } catch (error) {
      console.error('Error updating profile:', error)
      setProfileError('Erro ao atualizar perfil. Tente novamente.')
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const onSubmitPassword = async (data: PasswordFormData) => {
    if (!user) return

    setIsLoadingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(null)

    try {
      // Update password
      await updatePassword(user, data.newPassword)
      
      setPasswordSuccess('Senha alterada com sucesso!')
      passwordForm.reset()

    } catch (error: unknown) {
      console.error('Error updating password:', error)
      
      const firebaseError = error as { code?: string }
      if (firebaseError.code === 'auth/weak-password') {
        setPasswordError('A senha é muito fraca. Escolha uma senha mais forte.')
      } else if (firebaseError.code === 'auth/requires-recent-login') {
        setPasswordError('Para alterar a senha, você precisa fazer login novamente.')
      } else {
        setPasswordError('Erro ao alterar senha. Tente novamente.')
      }
    } finally {
      setIsLoadingPassword(false)
    }
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

  const getRoleIcon = (role?: string) => {
    return role === 'admin' ? (
      <Shield className="h-4 w-4 text-blue-500" />
    ) : (
      <Eye className="h-4 w-4 text-gray-500" />
    )
  }

  const getRoleBadge = (role?: string) => {
    return (
      <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
        {role === 'admin' ? 'Administrador' : 'Visualizador'}
      </Badge>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e configurações de conta
        </p>
      </div>

      {/* User Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Informações da Conta</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
              <AvatarFallback className="text-lg">
                {getInitials(user.displayName || undefined, user.email || undefined)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2">
              <div>
                <h3 className="text-lg font-semibold">{user.displayName || 'Nome não definido'}</h3>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
              
              <div className="flex items-center space-x-2">
                {getRoleIcon(userDetails?.role?.type)}
                {getRoleBadge(userDetails?.role?.type)}
              </div>

              {userDetails?.metadata?.department && (
                <p className="text-sm text-muted-foreground">
                  <strong>Departamento:</strong> {userDetails.metadata.department}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information Form */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>
            Atualize suas informações pessoais e de contato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
            {profileError && (
              <Alert variant="destructive">
                <AlertDescription>{profileError}</AlertDescription>
              </Alert>
            )}

            {profileSuccess && (
              <Alert>
                <AlertDescription>{profileSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="displayName">Nome Completo *</Label>
              <Input
                id="displayName"
                {...profileForm.register('displayName')}
                disabled={isLoadingProfile}
              />
              {profileForm.formState.errors.displayName && (
                <p className="text-sm text-red-600">{profileForm.formState.errors.displayName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                {...profileForm.register('phone')}
                disabled={isLoadingProfile}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                placeholder="Vendas, Marketing, etc."
                {...profileForm.register('department')}
                disabled={isLoadingProfile}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Conte um pouco sobre você..."
                rows={3}
                {...profileForm.register('bio')}
                disabled={isLoadingProfile}
              />
              {profileForm.formState.errors.bio && (
                <p className="text-sm text-red-600">{profileForm.formState.errors.bio.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isLoadingProfile}>
              {isLoadingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Alterar Senha</span>
          </CardTitle>
          <CardDescription>
            Altere sua senha para manter sua conta segura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
            {passwordError && (
              <Alert variant="destructive">
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}

            {passwordSuccess && (
              <Alert>
                <AlertDescription>{passwordSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual *</Label>
              <Input
                id="currentPassword"
                type="password"
                {...passwordForm.register('currentPassword')}
                disabled={isLoadingPassword}
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-sm text-red-600">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha *</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Mínimo 8 caracteres"
                {...passwordForm.register('newPassword')}
                disabled={isLoadingPassword}
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-sm text-red-600">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite a nova senha novamente"
                {...passwordForm.register('confirmPassword')}
                disabled={isLoadingPassword}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isLoadingPassword}>
              {isLoadingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Alterar Senha
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}