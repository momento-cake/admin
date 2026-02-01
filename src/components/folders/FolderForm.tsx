'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Images, User, Link2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  createFolderSchema,
  updateFolderSchema,
  generateSlug,
  CreateFolderFormData,
  UpdateFolderFormData
} from '@/lib/validators/folder'
import { ImageFolder } from '@/types/folder'
import { Client } from '@/types/client'

interface FolderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folder?: ImageFolder | null
  selectedImageIds?: string[]
  clients?: Client[]
  onSubmit: (data: CreateFolderFormData | UpdateFolderFormData) => Promise<void>
  isLoading?: boolean
}

export function FolderForm({
  open,
  onOpenChange,
  folder,
  selectedImageIds = [],
  clients = [],
  onSubmit,
  isLoading = false
}: FolderFormProps) {
  const isEditing = !!folder

  const schema = isEditing ? updateFolderSchema : createFolderSchema

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<CreateFolderFormData | UpdateFolderFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: folder?.name || '',
      slug: folder?.slug || '',
      description: folder?.description || '',
      imageIds: folder?.imageIds || selectedImageIds,
      clientId: folder?.clientId || undefined,
      isPublic: folder?.isPublic ?? true
    }
  })

  const name = watch('name')
  const isPublic = watch('isPublic') ?? true
  const imageIds = watch('imageIds') ?? []

  // Auto-generate slug from name when creating
  React.useEffect(() => {
    if (!isEditing && name) {
      setValue('slug', generateSlug(name))
    }
  }, [name, isEditing, setValue])

  // Reset form when opening
  React.useEffect(() => {
    if (open) {
      reset({
        name: folder?.name || '',
        slug: folder?.slug || '',
        description: folder?.description || '',
        imageIds: folder?.imageIds || selectedImageIds,
        clientId: folder?.clientId || undefined,
        isPublic: folder?.isPublic ?? true
      })
    }
  }, [open, folder, selectedImageIds, reset])

  const handleFormSubmit = async (data: any) => {
    await onSubmit(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Pasta' : 'Nova Pasta'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Edite as informações da pasta de imagens.'
              : 'Crie uma nova pasta para organizar suas imagens.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Ex: Casamento Maria & João"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">URL da pasta</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/gallery/</span>
              <Input
                id="slug"
                placeholder="casamento-maria-joao"
                {...register('slug')}
                className="flex-1"
              />
            </div>
            {errors.slug && (
              <p className="text-sm text-destructive">{errors.slug.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Use apenas letras minúsculas, números e hífens.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descrição opcional da pasta..."
              rows={3}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Client binding */}
          <div className="space-y-2">
            <Label htmlFor="clientId">Vincular a um cliente</Label>
            <select
              id="clientId"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              {...register('clientId')}
            >
              <option value="">Nenhum cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Vincule esta pasta a um cliente para organização.
            </p>
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                {isPublic ? (
                  <Eye className="h-4 w-4 text-green-600" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Label htmlFor="isPublic" className="font-medium">
                  Pasta pública
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {isPublic
                  ? 'Qualquer pessoa com o link pode ver esta pasta.'
                  : 'Apenas usuários autenticados podem ver esta pasta.'}
              </p>
            </div>
            <Switch
              id="isPublic"
              checked={isPublic}
              onCheckedChange={(checked) => setValue('isPublic', checked)}
            />
          </div>

          {/* Image count info */}
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
            <Images className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">
              {imageIds?.length || 0} {(imageIds?.length || 0) === 1 ? 'imagem selecionada' : 'imagens selecionadas'}
            </span>
          </div>
          {errors.imageIds && (
            <p className="text-sm text-destructive">{errors.imageIds.message}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? 'Salvando...' : 'Criando...'}
                </>
              ) : isEditing ? (
                'Salvar'
              ) : (
                'Criar pasta'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
