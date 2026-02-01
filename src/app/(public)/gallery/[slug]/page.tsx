'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { PublicGalleryView } from '@/components/public/PublicGalleryView'
import { PublicFolderWithImages } from '@/types/folder'

export default function PublicGalleryPage() {
  const params = useParams()
  const slug = params.slug as string

  const [folder, setFolder] = React.useState<PublicFolderWithImages | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadFolder() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/public/folders/${slug}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('Galeria não encontrada')
          } else {
            setError('Erro ao carregar galeria')
          }
          return
        }

        const data = await response.json()
        setFolder(data)
      } catch (err) {
        console.error('Error loading public folder:', err)
        setError('Erro ao carregar galeria')
      } finally {
        setIsLoading(false)
      }
    }

    if (slug) {
      loadFolder()
    }
  }, [slug])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-gray-500">Carregando galeria...</p>
        </div>
      </div>
    )
  }

  if (error || !folder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-gray-900 mb-2">
            {error || 'Galeria não encontrada'}
          </h1>
          <p className="text-gray-500">
            A galeria que você está procurando não existe ou não está mais disponível.
          </p>
        </div>
      </div>
    )
  }

  return <PublicGalleryView folder={folder} />
}
