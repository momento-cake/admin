import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Galeria | Momento Cake',
  description: 'Galeria de fotos Momento Cake',
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-white antialiased">
        {children}
      </body>
    </html>
  )
}
