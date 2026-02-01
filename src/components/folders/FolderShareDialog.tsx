'use client'

import * as React from 'react'
import { Copy, ExternalLink, Check, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { ImageFolder } from '@/types/folder'

interface FolderShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folder: ImageFolder | null
}

export function FolderShareDialog({
  open,
  onOpenChange,
  folder
}: FolderShareDialogProps) {
  const [copied, setCopied] = React.useState(false)
  const [displayUrl, setDisplayUrl] = React.useState('')

  // Build URL on client side only to prevent hydration mismatch
  React.useEffect(() => {
    if (folder && typeof window !== 'undefined') {
      const publicUrl = `${window.location.protocol}//gallery.${window.location.host.replace(/^(admin\.)?/, '')}/${folder.slug}`
      const devUrl = `${window.location.origin}/gallery/${folder.slug}`
      setDisplayUrl(process.env.NODE_ENV === 'development' ? devUrl : publicUrl)
    }
  }, [folder])

  if (!folder) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleOpenInNewTab = () => {
    window.open(displayUrl, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Compartilhar pasta</DialogTitle>
          <DialogDescription>
            Compartilhe o link público desta pasta com seus clientes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Folder info */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <p className="font-medium">{folder.name}</p>
            {folder.description && (
              <p className="text-sm text-muted-foreground mt-1">{folder.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {folder.imageIds.length} {folder.imageIds.length === 1 ? 'imagem' : 'imagens'}
            </p>
          </div>

          {/* Public URL */}
          <div className="space-y-2">
            <Label>Link público</Label>
            <div className="flex gap-2">
              <Input
                value={displayUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className="flex-1"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar link
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={handleOpenInNewTab}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir galeria
            </Button>
          </div>

          {/* Note about public access */}
          {folder.isPublic ? (
            <p className="text-sm text-muted-foreground text-center">
              Qualquer pessoa com este link pode ver as imagens desta pasta.
            </p>
          ) : (
            <p className="text-sm text-amber-600 text-center">
              Esta pasta está privada. Torne-a pública para compartilhar.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
