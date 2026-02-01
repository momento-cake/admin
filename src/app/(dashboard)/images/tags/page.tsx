'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Tag as TagIcon, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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
import { TagBadge } from '@/components/images/TagBadge';
import { TagForm } from '@/components/images/TagForm';
import { useAuth } from '@/hooks/useAuth';
import { ImageTag, DEFAULT_TAG_COLOR } from '@/types/image';
import {
  fetchTags,
  createTag,
  updateTag,
  deleteTag,
  getTagImageCounts
} from '@/lib/images';
import { CreateTagFormData } from '@/lib/validators/image';

export default function TagsPage() {
  const { user } = useAuth();
  const [tags, setTags] = useState<ImageTag[]>([]);
  const [tagCounts, setTagCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form dialog state
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<ImageTag | null>(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTag, setDeletingTag] = useState<ImageTag | null>(null);

  // Load tags
  const loadTags = useCallback(async () => {
    try {
      setLoading(true);
      const [tagsResponse, counts] = await Promise.all([
        fetchTags(),
        getTagImageCounts()
      ]);
      setTags(tagsResponse.tags);
      setTagCounts(counts);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // Filtered tags
  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle create
  const handleCreate = () => {
    setEditingTag(null);
    setShowForm(true);
  };

  // Handle edit
  const handleEdit = (tag: ImageTag) => {
    setEditingTag(tag);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = (tag: ImageTag) => {
    setDeletingTag(tag);
    setShowDeleteConfirm(true);
  };

  // Submit form
  const handleSubmit = async (data: CreateTagFormData) => {
    if (!user) return;

    if (editingTag) {
      await updateTag({ id: editingTag.id, ...data });
    } else {
      await createTag(data, user.uid);
    }

    await loadTags();
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deletingTag) return;

    try {
      await deleteTag(deletingTag.id);
      setShowDeleteConfirm(false);
      setDeletingTag(null);
      await loadTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('Erro ao excluir tag: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-momento-text">Gerenciar Tags</h1>
          <p className="text-muted-foreground">
            Crie e organize tags para categorizar suas imagens
          </p>
        </div>

        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Tag
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Buscar tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">
          {filteredTags.length} {filteredTags.length === 1 ? 'tag' : 'tags'}
        </span>
      </div>

      {/* Tags Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
          <CardDescription>
            Gerencie as tags utilizadas para organizar as imagens da galeria
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <TagIcon className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma tag encontrada</p>
              <p className="text-sm">
                {searchQuery
                  ? 'Tente uma busca diferente'
                  : 'Crie uma tag para começar a organizar suas imagens'}
              </p>
              {!searchQuery && (
                <Button onClick={handleCreate} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira tag
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Imagens</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTags.map(tag => {
                  const imageCount = tagCounts.get(tag.id) || 0;
                  return (
                    <TableRow key={tag.id}>
                      <TableCell>
                        <TagBadge tag={tag} size="md" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-5 w-5 rounded-full border"
                            style={{ backgroundColor: tag.color }}
                          />
                          <code className="text-xs text-muted-foreground">
                            {tag.color}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                          <span>{imageCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(tag.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(tag)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tag)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Color Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Visão Geral das Tags</CardTitle>
          <CardDescription>
            Visualização rápida de todas as tags e suas cores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <TagBadge
                key={tag.id}
                tag={tag}
                size="lg"
                interactive
                onClick={() => handleEdit(tag)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tag Form Dialog */}
      <TagForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={handleSubmit}
        tag={editingTag || undefined}
        existingNames={tags.map(t => t.name)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tag &quot;{deletingTag?.name}&quot;?
              {tagCounts.get(deletingTag?.id || '') ? (
                <span className="block mt-2 text-amber-600">
                  Atenção: Esta tag está sendo usada em {tagCounts.get(deletingTag?.id || '')} {tagCounts.get(deletingTag?.id || '') === 1 ? 'imagem' : 'imagens'}.
                  A tag será removida dessas imagens.
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
