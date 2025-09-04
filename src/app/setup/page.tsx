'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { SetupForm } from '@/components/auth/SetupForm'

export default function SetupPage() {
  const router = useRouter()
  const { loading, userModel, checkIfAdminsExist } = useAuth()

  useEffect(() => {
    const checkSetupStatus = async () => {
      if (loading) return

      // If user is already authenticated, redirect to dashboard
      if (userModel) {
        router.replace('/dashboard')
        return
      }

      // Check if admin users already exist
      const adminsExist = await checkIfAdminsExist()
      if (adminsExist) {
        // If admins exist, redirect to login
        router.replace('/login')
        return
      }
    }

    checkSetupStatus()
  }, [loading, userModel, router, checkIfAdminsExist])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-muted-foreground">Verificando configuração...</p>
        </div>
      </div>
    )
  }

  return <SetupForm />
}