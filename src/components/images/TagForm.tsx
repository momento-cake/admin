'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { TagColorPicker } from './TagColorPicker';
import { TagBadge } from './TagBadge';
import { createTagValidation, CreateTagFormData } from '@/lib/validators/image';
import { ImageTag, DEFAULT_TAG_COLOR } from '@/types/image';

interface TagFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTagFormData) => Promise<void>;
  tag?: ImageTag;
  existingNames?: string[];
}

export function TagForm({
  open,
  onOpenChange,
  onSubmit,
  tag,
  existingNames = []
}: TagFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CreateTagFormData>({
    resolver: zodResolver(createTagValidation),
    defaultValues: {
      name: tag?.name || '',
      color: tag?.color || DEFAULT_TAG_COLOR
    }
  });

  // Reset form when tag changes or dialog opens/closes
  React.useEffect(() => {
    if (open) {
      form.reset({
        name: tag?.name || '',
        color: tag?.color || DEFAULT_TAG_COLOR
      });
    }
  }, [open, tag, form]);

  const watchedValues = form.watch();

  const handleSubmit = async (data: CreateTagFormData) => {
    // Check for duplicate name (excluding current tag)
    const normalizedName = data.name.toLowerCase().trim();
    const isDuplicate = existingNames.some(
      name => name.toLowerCase().trim() === normalizedName && name !== tag?.name
    );

    if (isDuplicate) {
      form.setError('name', { message: 'Já existe uma tag com este nome' });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar tag';
      form.setError('root', { message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {tag ? 'Editar Tag' : 'Nova Tag'}
          </DialogTitle>
          <DialogDescription>
            {tag
              ? 'Atualize o nome e a cor da tag.'
              : 'Crie uma nova tag para organizar suas imagens.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Preview */}
            {watchedValues.name && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Preview:</span>
                <TagBadge
                  tag={{
                    id: 'preview',
                    name: watchedValues.name,
                    color: watchedValues.color || DEFAULT_TAG_COLOR,
                    createdAt: new Date(),
                    createdBy: '',
                    isActive: true
                  }}
                  size="lg"
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Tag</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Casamento, Aniversário, Infantil..."
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <FormControl>
                    <TagColorPicker
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : tag ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
