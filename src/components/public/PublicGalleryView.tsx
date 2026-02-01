'use client'

import * as React from 'react'
import { X, ChevronLeft, ChevronRight, Download, Globe } from 'lucide-react'
import { PublicFolderWithImages, PublicFolderImage } from '@/types/folder'

interface PublicGalleryViewProps {
  folder: PublicFolderWithImages
}

export function PublicGalleryView({ folder }: PublicGalleryViewProps) {
  const [selectedImage, setSelectedImage] = React.useState<PublicFolderImage | null>(null)
  const [currentIndex, setCurrentIndex] = React.useState(0)

  const openLightbox = (image: PublicFolderImage, index: number) => {
    setSelectedImage(image)
    setCurrentIndex(index)
  }

  const closeLightbox = () => {
    setSelectedImage(null)
  }

  const goToPrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : folder.images.length - 1
    setCurrentIndex(newIndex)
    setSelectedImage(folder.images[newIndex])
  }

  const goToNext = () => {
    const newIndex = currentIndex < folder.images.length - 1 ? currentIndex + 1 : 0
    setCurrentIndex(newIndex)
    setSelectedImage(folder.images[newIndex])
  }

  const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
    if (!selectedImage) return

    switch (e.key) {
      case 'Escape':
        closeLightbox()
        break
      case 'ArrowLeft':
        goToPrevious()
        break
      case 'ArrowRight':
        goToNext()
        break
    }
  }, [selectedImage, currentIndex])

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleDownload = (image: PublicFolderImage) => {
    const link = document.createElement('a')
    link.href = image.url
    link.download = `imagem-${image.id}.jpg`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="py-8 px-4 text-center border-b bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-serif text-gray-900 mb-2">
            {folder.name}
          </h1>
          {folder.description && (
            <p className="text-gray-600 max-w-2xl mx-auto mb-4">
              {folder.description}
            </p>
          )}
          <p className="text-sm text-gray-500">
            {folder.imageCount} {folder.imageCount === 1 ? 'foto' : 'fotos'}
          </p>
        </div>
      </header>

      {/* Gallery Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {folder.images.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Esta galeria não contém imagens.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {folder.images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => openLightbox(image, index)}
                className="aspect-square relative overflow-hidden rounded-lg group focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
              >
                <img
                  src={image.thumbnailUrl || image.url}
                  alt={image.description || `Foto ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                {/* External badge */}
                {image.isExternal && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/90 text-white text-xs font-medium">
                    <Globe className="h-3 w-3" />
                    Referência
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-500 border-t">
        <p className="flex items-center justify-center gap-2">
          <span className="text-pink-500 font-medium">Momento Cake</span>
          <span>•</span>
          <span>Galeria de Fotos</span>
        </p>
      </footer>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black z-50 flex flex-col"
          onClick={closeLightbox}
        >
          {/* Lightbox header */}
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm">
              {currentIndex + 1} / {folder.images.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload(selectedImage)
                }}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                title="Download"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={closeLightbox}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                title="Fechar"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Image container */}
          <div
            className="flex-1 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.description || `Foto ${currentIndex + 1}`}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {/* Navigation buttons */}
          {folder.images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToPrevious()
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                title="Anterior"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToNext()
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                title="Próxima"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          {/* Description */}
          {selectedImage.description && (
            <div className="p-4 text-center text-white bg-black/50">
              <p>{selectedImage.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
