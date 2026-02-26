import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="h-screen flex bg-background">
        <div className="hidden md:flex md:w-64 md:flex-col">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}