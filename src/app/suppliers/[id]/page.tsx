'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Star, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SupplierForm } from '@/components/suppliers/SupplierForm';
import { fetchSupplier, updateSupplier, deleteSupplier, formatRating, getRatingColor, formatPhone, formatSupplierCategories } from '@/lib/suppliers';
import { Supplier, CreateSupplierData } from '@/types/ingredient';

export default function SupplierPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadSupplier();
  }, [supplierId]);

  const loadSupplier = async () => {
    try {
      setLoading(true);
      const data = await fetchSupplier(supplierId);
      setSupplier(data);
    } catch (error) {
      console.error('Erro ao carregar fornecedor:', error);
      router.push('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: CreateSupplierData) => {
    if (!supplier) return;

    try {
      setUpdating(true);
      const updated = await updateSupplier({ ...data, id: supplier.id });
      setSupplier(updated);
      setEditMode(false);
    } catch (error) {
      console.error('Erro ao atualizar fornecedor:', error);
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!supplier) return;

    try {
      setDeleting(true);
      await deleteSupplier(supplier.id);
      router.push('/suppliers');
      router.refresh();
    } catch (error) {
      console.error('Erro ao deletar fornecedor:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-2">Fornecedor não encontrado</h2>
        <p className="text-muted-foreground mb-4">
          O fornecedor que você está procurando não existe ou foi removido.
        </p>
        <Button onClick={() => router.push('/suppliers')}>
          Voltar aos Fornecedores
        </Button>
      </div>
    );
  }

  if (editMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setEditMode(false)}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-momento-text">Editar Fornecedor</h1>
            <p className="text-muted-foreground">Atualize as informações do fornecedor</p>
          </div>
        </div>

        <div className="max-w-2xl">
          <SupplierForm
            initialData={{
              name: supplier.name,
              contactPerson: supplier.contactPerson,
              phone: supplier.phone,
              email: supplier.email,
              address: supplier.address,
              rating: supplier.rating,
              categories: supplier.categories
            }}
            onSubmit={handleUpdate}
            loading={updating}
            submitLabel="Salvar Alterações"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-momento-text">{supplier.name}</h1>
          <p className="text-muted-foreground">
            Fornecedor desde {new Date(supplier.createdAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setEditMode(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
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
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Informações Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">
                    Nome do Fornecedor
                  </h4>
                  <p className="font-medium">{supplier.name}</p>
                </div>
                
                {supplier.contactPerson && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">
                      Pessoa de Contato
                    </h4>
                    <p>{supplier.contactPerson}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">
                    Avaliação
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${getRatingColor(supplier.rating)}`}>
                      {formatRating(supplier.rating)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {supplier.rating.toFixed(1)}/5.0
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">
                    Status
                  </h4>
                  <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
                    {supplier.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {supplier.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{formatPhone(supplier.phone)}</p>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                    </div>
                  </div>
                )}

                {supplier.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{supplier.email}</p>
                      <p className="text-sm text-muted-foreground">E-mail</p>
                    </div>
                  </div>
                )}

                {supplier.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="font-medium">{supplier.address}</p>
                      <p className="text-sm text-muted-foreground">Endereço</p>
                    </div>
                  </div>
                )}
              </div>

              {!supplier.phone && !supplier.email && !supplier.address && (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma informação de contato cadastrada
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Categorias</CardTitle>
            </CardHeader>
            <CardContent>
              {supplier.categories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {supplier.categories.map((category) => (
                    <Badge key={category} variant="outline">
                      {category}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma categoria definida
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}