import { Suspense } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AccessDeniedHandler } from '@/components/auth/AccessDeniedHandler'
import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <AccessDeniedHandler />
      </Suspense>
      <div className="h-screen flex bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}