import { Suspense } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AccessDeniedHandler } from '@/components/auth/AccessDeniedHandler'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

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
        <div className="hidden md:flex md:w-64 md:flex-col">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="md:hidden">
            <Header />
          </div>
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}