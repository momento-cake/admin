'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Trash2, Phone, Mail, MapPin, Eye, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Supplier } from '@/types/ingredient';
import { deleteSupplier, formatRating, getRatingColor, formatPhone } from '@/lib/suppliers';

interface SupplierListProps {
  suppliers: Supplier[];
  onDeleted: (id: string) => void;
  onUpdated?: (updatedSupplier: Supplier) => void;
  onView?: (supplier: Supplier) => void;
  onEdit?: (supplier: Supplier) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function SupplierList({ suppliers, onDeleted, onUpdated, onView, onEdit, onRefresh, isLoading = false, error }: SupplierListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (supplier: Supplier) => {
    try {
      setDeletingId(supplier.id);
      await deleteSupplier(supplier.id);
      onDeleted(supplier.id);
    } catch (error) {
      console.error('Erro ao deletar fornecedor:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = (supplier: Supplier) => {
    if (onView) {
      onView(supplier);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    if (onEdit) {
      onEdit(supplier);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando fornecedores...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum fornecedor encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {suppliers.length} fornecedor{suppliers.length !== 1 ? 'es' : ''} encontrado{suppliers.length !== 1 ? 's' : ''}
        </p>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        )}
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Avaliação</TableHead>
              <TableHead>Categorias</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id} className="hover:bg-muted/50">
                <TableCell>
                  <div>
                    <div className="font-medium">{supplier.name}</div>
                    {supplier.contactPerson && (
                      <div className="text-sm text-muted-foreground">
                        {supplier.contactPerson}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{formatPhone(supplier.phone)}</span>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{supplier.email}</span>
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{supplier.address}</span>
                      </div>
                    )}
                    {!supplier.phone && !supplier.email && !supplier.address && (
                      <span className="text-sm text-muted-foreground">
                        Sem contato
                      </span>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${getRatingColor(supplier.rating)}`}>
                      {formatRating(supplier.rating)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {supplier.rating.toFixed(1)}
                    </span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="max-w-[200px]">
                    {supplier.categories.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {supplier.categories.slice(0, 2).map((category) => (
                          <Badge key={category} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                        {supplier.categories.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{supplier.categories.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Sem categorias
                      </span>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
                    {supplier.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(supplier)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(supplier)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                            onClick={() => handleDelete(supplier)}
                            disabled={deletingId === supplier.id}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {deletingId === supplier.id ? 'Excluindo...' : 'Excluir'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}