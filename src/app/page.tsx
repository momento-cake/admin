'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
  const router = useRouter()
  const { userModel, loading, hasPlatformAccess, checkIfAdminsExist } = useAuth()

  useEffect(() => {
    const handleRouting = async () => {
      if (!loading) {
        if (userModel && hasPlatformAccess()) {
          router.push('/dashboard')
        } else {
          // Check if any admin users exist
          const adminsExist = await checkIfAdminsExist()
          if (!adminsExist) {
            router.push('/setup')
          } else {
            router.push('/login')
          }
        }
      }
    }

    handleRouting()
  }, [userModel, loading, router, hasPlatformAccess, checkIfAdminsExist])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  )
}
