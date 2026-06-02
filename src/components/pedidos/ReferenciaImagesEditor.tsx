'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ImageUploadDropzone,
  UploadProgress,
} from '@/components/images/ImageUploadDropzone'
import { uploadMultipleImages, deleteImage } from '@/lib/storage'
import type { PedidoImagemReferenciaInput } from '@/types/pedido'

const REFERENCIA_FOLDER = 'images/gallery/pedido-referencias'

interface ReferenciaImagesEditorProps {
  value: PedidoImagemReferenciaInput[]
  /** Continuous updates (e.g. caption typing) — keep local state in sync. */
  onChange: (next: PedidoImagemReferenciaInput[]) => void
  /** Fired on structural changes (upload done, remove) and caption blur — the
   *  right moment to persist. Optional; the creation wizard omits it. */
  onCommit?: (next: PedidoImagemReferenciaInput[]) => void
  disabled?: boolean
}

interface ProgressState {
  current: number
  total: number
  file?: string
}

export function ReferenciaImagesEditor({
  value,
  onChange,
  onCommit,
  disabled = false,
}: ReferenciaImagesEditorProps) {
  const [staged, setStaged] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [dropzoneKey, setDropzoneKey] = useState(0)

  const commit = (next: PedidoImagemReferenciaInput[]) => {
    onChange(next)
    onCommit?.(next)
  }

  const handleUpload = async () => {
    if (!staged.length || uploading) return
    setUploading(true)
    setProgress({ current: 0, total: staged.length })
    try {
      const { successful, failed } = await uploadMultipleImages(
        staged,
        REFERENCIA_FOLDER,
        (current, total, file) => setProgress({ current, total, file })
      )
      if (successful.length) {
        commit([
          ...value,
          ...successful.map((r) => ({
            url: r.url,
            storagePath: r.storagePath,
            width: r.width,
            height: r.height,
          })),
        ])
        toast.success(
          `${successful.length} ${successful.length === 1 ? 'imagem adicionada' : 'imagens adicionadas'}`
        )
      }
      if (failed.length) {
        toast.error(
          `${failed.length} ${failed.length === 1 ? 'imagem falhou' : 'imagens falharam'} no envio`
        )
      }
      setStaged([])
      setDropzoneKey((k) => k + 1)
    } catch (error) {
      toast.error('Erro ao enviar imagens', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setUploading(false)
      setProgress(null)
    }
  }

  const handleRemove = async (index: number) => {
    const img = value[index]
    commit(value.filter((_, i) => i !== index))
    // Best-effort storage cleanup; ignore failures (safe if already gone).
    try {
      await deleteImage(img.storagePath)
    } catch {
      /* noop */
    }
  }

  const handleLegendaChange = (index: number, legenda: string) => {
    onChange(value.map((img, i) => (i === index ? { ...img, legenda } : img)))
  }

  return (
    <div className="space-y-4">
      {!disabled && (
        <>
          <ImageUploadDropzone
            key={dropzoneKey}
            onFilesSelected={setStaged}
            disabled={uploading}
          />
          {uploading && progress ? (
            <UploadProgress
              current={progress.current}
              total={progress.total}
              currentFileName={progress.file}
            />
          ) : (
            staged.length > 0 && (
              <Button onClick={handleUpload} disabled={uploading} className="w-full sm:w-auto">
                Enviar {staged.length} {staged.length === 1 ? 'imagem' : 'imagens'}
              </Button>
            )
          )}
        </>
      )}

      {value.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((img, index) => (
            <div
              key={img.id ?? img.storagePath ?? index}
              className="relative group rounded-lg border overflow-hidden"
            >
              <div className="aspect-square relative bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.legenda || 'Imagem de referência'}
                  className="h-full w-full object-cover"
                />
                {!disabled && (
                  <button
                    type="button"
                    aria-label="Remover imagem"
                    onClick={() => handleRemove(index)}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="p-2">
                {disabled ? (
                  img.legenda ? (
                    <p className="text-xs text-muted-foreground truncate" title={img.legenda}>
                      {img.legenda}
                    </p>
                  ) : null
                ) : (
                  <Input
                    value={img.legenda ?? ''}
                    onChange={(e) => handleLegendaChange(index, e.target.value)}
                    onBlur={() => onCommit?.(value)}
                    placeholder="Legenda (opcional)"
                    maxLength={200}
                    aria-label={`Legenda da imagem ${index + 1}`}
                    className="h-7 text-xs"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        disabled && (
          <p className="text-sm text-muted-foreground">Nenhuma imagem de referência.</p>
        )
      )}
    </div>
  )
}
