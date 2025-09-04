'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserRegistrationData, UserInvitation } from '@/types'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

const registrationSchema = z.object({
  firstName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  lastName: z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  department: z.string().optional(),
  acceptsTerms: z.boolean().refine(val => val === true, 'Você deve aceitar os termos')
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
})

type RegistrationFormData = z.infer<typeof registrationSchema>

export function RegistrationForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifyingToken, setIsVerifyingToken] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<UserInvitation | null>(null)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      department: '',
      acceptsTerms: false,
    },
  })

  // Verify invitation token on component mount
  useEffect(() => {
    if (!token) {
      setError('Token de convite não fornecido')
      setIsVerifyingToken(false)
      return
    }

    const verifyToken = async () => {
      try {
        const response = await fetch('/api/invitations/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Token inválido')
        }

        const data = await response.json()
        
        if (data.valid && data.invitation) {
          setInvitation(data.invitation)
          // Pre-populate form with invitation data
          form.setValue('email', data.invitation.email)
          if (data.invitation.metadata?.department) {
            form.setValue('department', data.invitation.metadata.department)
          }
          setError(null)
        } else {
          throw new Error('Convite inválido ou expirado')
        }
      } catch (error) {
        console.error('Error verifying token:', error)
        setError(error instanceof Error ? error.message : 'Erro ao verificar convite')
      } finally {
        setIsVerifyingToken(false)
      }
    }

    verifyToken()
  }, [token, form])


  const onSubmit = async (data: RegistrationFormData) => {
    if (!token) {
      setError('Token de convite não encontrado')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const registrationData: UserRegistrationData = {
        invitationToken: token,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone,
        department: data.department,
        acceptsTerms: data.acceptsTerms,
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar conta')
      }

      await response.json()
      setSuccess('Conta criada com sucesso! Verifique seu email para ativar sua conta.')
      
      // Redirect to login after a delay
      setTimeout(() => {
        router.push('/login')
      }, 3000)

    } catch (error) {
      console.error('Error registering user:', error)
      setError(error instanceof Error ? error.message : 'Erro interno do servidor')
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerifyingToken) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-2 text-sm text-gray-600">Verificando convite...</p>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="text-center py-8">
        <XCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Convite Inválido</h3>
        <p className="mt-2 text-sm text-gray-600">{error}</p>
        <Button 
          className="mt-4" 
          onClick={() => router.push('/login')}
          variant="outline"
        >
          Voltar ao Login
        </Button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Conta Criada!</h3>
        <p className="mt-2 text-sm text-gray-600">{success}</p>
        <p className="mt-2 text-xs text-gray-500">
          Redirecionando para o login em alguns segundos...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {invitation && (
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">
            Olá, {invitation.name}!
          </h3>
          <p className="text-sm text-gray-600">
            Você foi convidado como <strong>{invitation.role === 'admin' ? 'Administrador' : 'Visualizador'}</strong>
          </p>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Nome *</Label>
            <Input
              id="firstName"
              placeholder="João"
              {...form.register('firstName')}
              disabled={isLoading}
            />
            {form.formState.errors.firstName && (
              <p className="text-sm text-red-600">{form.formState.errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Sobrenome *</Label>
            <Input
              id="lastName"
              placeholder="Silva"
              {...form.register('lastName')}
              disabled={isLoading}
            />
            {form.formState.errors.lastName && (
              <p className="text-sm text-red-600">{form.formState.errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            {...form.register('email')}
            disabled={true} // Email should not be editable as it comes from invitation
            className="bg-gray-50"
          />
          <p className="text-xs text-gray-500">Este email foi fornecido no convite e não pode ser alterado</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha *</Label>
          <Input
            id="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            {...form.register('password')}
            disabled={isLoading}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Digite a senha novamente"
            {...form.register('confirmPassword')}
            disabled={isLoading}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-sm text-red-600">{form.formState.errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="(11) 99999-9999"
            {...form.register('phone')}
            disabled={isLoading}
          />
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

        <div className="flex items-center space-x-2">
          <Checkbox
            id="acceptsTerms"
            checked={form.watch('acceptsTerms')}
            onCheckedChange={(checked) => form.setValue('acceptsTerms', !!checked)}
            disabled={isLoading}
          />
          <Label htmlFor="acceptsTerms" className="text-sm">
            Eu aceito os <a href="#" className="text-blue-600 underline">termos de uso</a> e 
            <a href="#" className="text-blue-600 underline ml-1">política de privacidade</a> *
          </Label>
        </div>
        {form.formState.errors.acceptsTerms && (
          <p className="text-sm text-red-600">{form.formState.errors.acceptsTerms.message}</p>
        )}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Criando conta...
            </>
          ) : (
            'Criar Conta'
          )}
        </Button>

        <div className="text-center">
          <Button 
            type="button" 
            variant="link" 
            onClick={() => router.push('/login')}
            disabled={isLoading}
          >
            Já tem uma conta? Faça login
          </Button>
        </div>
      </form>
    </div>
  )
}