'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Trash2, Phone, Mail, MapPin, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Supplier } from '@/types/ingredient';
import { deleteSupplier, formatRating, getRatingColor, formatPhone } from '@/lib/suppliers';

interface SupplierCardProps {
  supplier: Supplier;
  onDeleted: (id: string) => void;
}

export function SupplierCard({ supplier, onDeleted }: SupplierCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteSupplier(supplier.id);
      onDeleted(supplier.id);
    } catch (error) {
      console.error('Erro ao deletar fornecedor:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleView = () => {
    router.push(`/suppliers/${supplier.id}`);
  };

  const handleEdit = () => {
    router.push(`/suppliers/${supplier.id}?edit=true`);
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-1">
              {supplier.name}
            </CardTitle>
            {supplier.contactPerson && (
              <p className="text-sm text-muted-foreground mt-1">
                {supplier.contactPerson}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
              {supplier.isActive ? 'Ativo' : 'Inativo'}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleView}>
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza de que deseja excluir o fornecedor &quot;{supplier.name}&quot;? 
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={deleting}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {deleting ? 'Excluindo...' : 'Excluir'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Rating */}
        <div className="flex items-center gap-2">
          <span className={`text-lg ${getRatingColor(supplier.rating)}`}>
            {formatRating(supplier.rating)}
          </span>
          <span className="text-sm text-muted-foreground">
            {supplier.rating.toFixed(1)}/5.0
          </span>
        </div>

        {/* Contact Info */}
        <div className="space-y-2">
          {supplier.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{formatPhone(supplier.phone)}</span>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{supplier.email}</span>
            </div>
          )}
          {supplier.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span className="line-clamp-2">{supplier.address}</span>
            </div>
          )}
        </div>

        {/* Categories */}
        {supplier.categories.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Categorias:</p>
            <div className="flex flex-wrap gap-1">
              {supplier.categories.slice(0, 3).map((category) => (
                <Badge key={category} variant="outline" className="text-xs">
                  {category}
                </Badge>
              ))}
              {supplier.categories.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{supplier.categories.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleView}
            className="flex-1"
          >
            Ver Detalhes
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}