'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Trash2, Image as ImageIcon, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageGrid } from '@/components/images/ImageCard';
import { ImageFilters } from '@/components/images/ImageFilters';
import { ImageUploadDropzone, UploadProgress } from '@/components/images/ImageUploadDropzone';
import { TagSelector } from '@/components/images/TagSelector';
import { TagBadge } from '@/components/images/TagBadge';
import { useAuth } from '@/hooks/useAuth';
import {
  GalleryImageWithTags,
  ImageTag,
  ImageFilters as ImageFiltersType,
  DEFAULT_TAG_COLOR
} from '@/types/image';
import {
  fetchImagesWithTags,
  fetchTags,
  createImage,
  deleteImageRecord,
  deleteMultipleImageRecords,
  updateImage,
  createTag,
  fetchImageWithTags
} from '@/lib/images';
import { CreateTagFormData } from '@/lib/validators/image';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function ImageGalleryPage() {
  const { user } = useAuth();
  const [images, setImages] = useState<GalleryImageWithTags[]>([]);
  const [tags, setTags] = useState<ImageTag[]>([]);
  const [filters, setFilters] = useState<ImageFiltersType>({});
  const [loading, setLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadTags, setUploadTags] = useState<string[]>([]);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, fileName: '' });

  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImageWithTags | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // View dialog state
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewingImage, setViewingImage] = useState<GalleryImageWithTags | null>(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingImage, setDeletingImage] = useState<GalleryImageWithTags | null>(null);
  const [deletingMultiple, setDeletingMultiple] = useState(false);

  // Load images
  const loadImages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchImagesWithTags(filters);
      setImages(data);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load tags
  const loadTags = useCallback(async () => {
    try {
      const response = await fetchTags();
      setTags(response.tags);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // Handle upload
  const handleUpload = async () => {
    if (uploadFiles.length === 0 || !user) return;

    setUploading(true);
    setUploadProgress({ current: 0, total: uploadFiles.length, fileName: '' });

    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        setUploadProgress({
          current: i,
          total: uploadFiles.length,
          fileName: file.name
        });

        await createImage(file, uploadTags, user.uid, uploadDescription || undefined);
      }

      setUploadProgress({
        current: uploadFiles.length,
        total: uploadFiles.length,
        fileName: 'Concluído!'
      });

      // Reset and close
      setShowUploadDialog(false);
      setUploadFiles([]);
      setUploadTags([]);
      setUploadDescription('');
      loadImages();
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Erro ao fazer upload: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setUploading(false);
    }
  };

  // Handle create tag
  const handleCreateTag = async (data: CreateTagFormData): Promise<ImageTag> => {
    if (!user) throw new Error('Usuário não autenticado');
    const newTag = await createTag(data, user.uid);
    await loadTags();
    return newTag;
  };

  // Handle edit image
  const handleEdit = (image: GalleryImageWithTags) => {
    setEditingImage(image);
    setEditTags(image.tagIds);
    setEditDescription(image.description || '');
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingImage) return;

    setSaving(true);
    try {
      await updateImage({
        id: editingImage.id,
        tags: editTags,
        description: editDescription || undefined
      });

      setShowEditDialog(false);
      setEditingImage(null);
      loadImages();
    } catch (error) {
      console.error('Error updating image:', error);
      alert('Erro ao atualizar imagem: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  // Handle view image
  const handleView = (image: GalleryImageWithTags) => {
    setViewingImage(image);
    setShowViewDialog(true);
  };

  // Handle delete
  const handleDelete = (image: GalleryImageWithTags) => {
    setDeletingImage(image);
    setDeletingMultiple(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteSelected = () => {
    if (selectedImages.length === 0) return;
    setDeletingMultiple(true);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      if (deletingMultiple) {
        await deleteMultipleImageRecords(selectedImages);
        setSelectedImages([]);
        setSelectionMode(false);
      } else if (deletingImage) {
        await deleteImageRecord(deletingImage.id);
      }

      setShowDeleteConfirm(false);
      setDeletingImage(null);
      loadImages();
    } catch (error) {
      console.error('Error deleting image(s):', error);
      alert('Erro ao excluir: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedImages([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-momento-text">Galeria de Imagens</h1>
          <p className="text-muted-foreground">
            Gerencie imagens de referência para seus clientes
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectionMode && selectedImages.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir ({selectedImages.length})
            </Button>
          )}

          <Button
            variant="outline"
            onClick={toggleSelectionMode}
          >
            {selectionMode ? 'Cancelar seleção' : 'Selecionar'}
          </Button>

          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Enviar Imagens
          </Button>
        </div>
      </div>

      {/* Filters */}
      <ImageFilters
        filters={filters}
        onFiltersChange={setFilters}
        tags={tags}
      />

      {/* Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Imagens</CardTitle>
          <CardDescription>
            {loading
              ? 'Carregando...'
              : `${images.length} ${images.length === 1 ? 'imagem encontrada' : 'imagens encontradas'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <ImageGrid
              images={images}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              selectedImages={selectedImages}
              onSelectionChange={setSelectedImages}
              selectable={selectionMode}
              emptyMessage="Nenhuma imagem encontrada. Envie algumas imagens para começar."
            />
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enviar Imagens</DialogTitle>
            <DialogDescription>
              Selecione as imagens e adicione tags para facilitar a busca
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {uploading ? (
              <UploadProgress
                current={uploadProgress.current}
                total={uploadProgress.total}
                currentFileName={uploadProgress.fileName}
              />
            ) : (
              <>
                <ImageUploadDropzone
                  onFilesSelected={setUploadFiles}
                  maxFiles={20}
                  disabled={uploading}
                />

                {uploadFiles.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label>Tags (obrigatório para busca)</Label>
                      <TagSelector
                        tags={tags}
                        selectedTags={uploadTags}
                        onTagsChange={setUploadTags}
                        onCreateTag={handleCreateTag}
                        placeholder="Adicione tags às imagens..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Descrição (opcional)</Label>
                      <Textarea
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        placeholder="Descrição comum para todas as imagens..."
                        rows={2}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadFiles.length === 0 || uploading}
            >
              {uploading
                ? 'Enviando...'
                : `Enviar ${uploadFiles.length} ${uploadFiles.length === 1 ? 'imagem' : 'imagens'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Imagem</DialogTitle>
            <DialogDescription>
              Atualize as tags e descrição da imagem
            </DialogDescription>
          </DialogHeader>

          {editingImage && (
            <div className="space-y-6">
              {/* Image preview */}
              <div className="flex items-start gap-4">
                <img
                  src={editingImage.thumbnailUrl || editingImage.url}
                  alt={editingImage.originalName}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{editingImage.originalName}</p>
                  <p className="text-sm text-muted-foreground">
                    {editingImage.width} x {editingImage.height}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <TagSelector
                  tags={tags}
                  selectedTags={editTags}
                  onTagsChange={setEditTags}
                  onCreateTag={handleCreateTag}
                  placeholder="Adicione tags..."
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Descrição da imagem..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{viewingImage?.originalName}</DialogTitle>
          </DialogHeader>

          {viewingImage && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={viewingImage.url}
                  alt={viewingImage.description || viewingImage.originalName}
                  className="w-full h-full object-contain"
                />
              </div>

              {viewingImage.description && (
                <p className="text-sm text-muted-foreground">
                  {viewingImage.description}
                </p>
              )}

              {viewingImage.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {viewingImage.tags.map(tag => (
                    <TagBadge key={tag.id} tag={tag} size="md" />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{viewingImage.width} x {viewingImage.height} pixels</span>
                <span>
                  Enviado em {new Intl.DateTimeFormat('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).format(viewingImage.uploadedAt)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => handleEdit(viewingImage!)}>
              Editar
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(viewingImage?.url, '_blank')}
            >
              Abrir em nova aba
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingMultiple
                ? `Tem certeza que deseja excluir ${selectedImages.length} ${selectedImages.length === 1 ? 'imagem' : 'imagens'}? Esta ação não pode ser desfeita.`
                : `Tem certeza que deseja excluir a imagem "${deletingImage?.originalName}"? Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
