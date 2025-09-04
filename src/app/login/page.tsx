'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  const router = useRouter()
  const { loading, userModel, checkIfAdminsExist } = useAuth()

  useEffect(() => {
    const checkLoginStatus = async () => {
      if (loading) return

      // If user is already authenticated, redirect to dashboard
      if (userModel) {
        router.replace('/dashboard')
        return
      }

      // Check if any admin users exist
      const adminsExist = await checkIfAdminsExist()
      if (!adminsExist) {
        // If no admins exist, redirect to setup
        router.replace('/setup')
        return
      }
    }

    checkLoginStatus()
  }, [loading, userModel, router, checkIfAdminsExist])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  return <LoginForm />
}