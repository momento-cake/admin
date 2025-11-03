'use client'

/**
 * Packaging Management Root Page (Redirect to inventory)
 *
 * This page redirects to /packaging/inventory when accessed at /packaging
 * This follows the pattern used in the application for navigation consistency.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PackagingPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to inventory page
    router.push('/packaging/inventory')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Redirecionando...</p>
    </div>
  )
}
