import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8">
          {children}
        </div>
      </div>
    </ProtectedRoute>
  )
}