'use client';

import * as React from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { validateImageFile, formatFileSize } from '@/lib/validators/image';
import { SUPPORTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/types/image';

interface FileWithPreview extends File {
  preview?: string;
  error?: string;
}

interface ImageUploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

export function ImageUploadDropzone({
  onFilesSelected,
  maxFiles = 10,
  disabled = false,
  className
}: ImageUploadDropzoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [files, setFiles] = React.useState<FileWithPreview[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = React.useCallback((fileList: FileList | File[]) => {
    const newFiles: FileWithPreview[] = [];
    const fileArray = Array.from(fileList);

    for (const file of fileArray) {
      if (files.length + newFiles.length >= maxFiles) {
        break;
      }

      const validation = validateImageFile(file);
      const fileWithPreview: FileWithPreview = Object.assign(file, {
        preview: validation.isValid ? URL.createObjectURL(file) : undefined,
        error: validation.error
      });

      newFiles.push(fileWithPreview);
    }

    const allFiles = [...files, ...newFiles];
    setFiles(allFiles);

    // Only pass valid files to parent
    const validFiles = allFiles.filter(f => !f.error);
    onFilesSelected(validFiles);
  }, [files, maxFiles, onFilesSelected]);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const { files: droppedFiles } = e.dataTransfer;
    if (droppedFiles?.length) {
      processFiles(droppedFiles);
    }
  }, [disabled, processFiles]);

  const handleFileChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { files: selectedFiles } = e.target;
    if (selectedFiles?.length) {
      processFiles(selectedFiles);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  }, [processFiles]);

  const handleRemoveFile = React.useCallback((index: number) => {
    const file = files[index];
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }

    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);

    const validFiles = newFiles.filter(f => !f.error);
    onFilesSelected(validFiles);
  }, [files, onFilesSelected]);

  const handleClearAll = React.useCallback(() => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    onFilesSelected([]);
  }, [files, onFilesSelected]);

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);

  const acceptedTypes = SUPPORTED_IMAGE_TYPES.join(',');
  const maxSizeMB = MAX_IMAGE_SIZE / (1024 * 1024);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
          isDragging && 'border-primary bg-primary/5',
          disabled && 'opacity-50 cursor-not-allowed',
          !isDragging && !disabled && 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes}
          multiple
          onChange={handleFileChange}
          disabled={disabled}
          className="sr-only"
        />

        <div className="flex flex-col items-center gap-2 text-center">
          <div className={cn(
            'rounded-full p-3',
            isDragging ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}>
            <Upload className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragging ? 'Solte as imagens aqui' : 'Arraste e solte imagens aqui'}
            </p>
            <p className="text-xs text-muted-foreground">
              ou clique para selecionar
            </p>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            PNG, JPG, GIF ou WebP (max. {maxSizeMB}MB)
          </p>

          {maxFiles > 1 && (
            <p className="text-xs text-muted-foreground">
              Até {maxFiles} imagens por vez
            </p>
          )}
        </div>
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {files.length} {files.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-8 px-2 text-muted-foreground hover:text-destructive"
            >
              Limpar todos
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className={cn(
                  'relative group rounded-lg border overflow-hidden',
                  file.error && 'border-destructive bg-destructive/5'
                )}
              >
                {/* Preview or error icon */}
                <div className="aspect-square relative">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-muted">
                      {file.error ? (
                        <AlertCircle className="h-8 w-8 text-destructive" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* File info */}
                <div className="p-2 space-y-0.5">
                  <p className="text-xs font-medium truncate" title={file.name}>
                    {file.name}
                  </p>
                  {file.error ? (
                    <p className="text-xs text-destructive truncate" title={file.error}>
                      {file.error}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface UploadProgressProps {
  current: number;
  total: number;
  currentFileName?: string;
}

export function UploadProgress({ current, total, currentFileName }: UploadProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Enviando {current} de {total}...
        </span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
      {currentFileName && (
        <p className="text-xs text-muted-foreground truncate">
          {currentFileName}
        </p>
      )}
    </div>
  );
}
