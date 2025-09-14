'use client';

import { Phone, Mail, MapPin, Star, Calendar, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Supplier } from '@/types/ingredient';
import { formatRating, getRatingColor, formatPhone } from '@/lib/suppliers';

interface SupplierDetailModalProps {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierDetailModal({ supplier, open, onOpenChange }: SupplierDetailModalProps) {
  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[85vw] max-w-[85vw] min-w-[85vw] h-[95vh] overflow-y-auto !max-w-none m-0 p-6" style={{ width: '85vw', maxWidth: '85vw' }}>
        <DialogHeader>
          <DialogTitle>{supplier.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome</label>
                  <p className="text-base">{supplier.name}</p>
                </div>
                {supplier.contactPerson && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Pessoa de Contato</label>
                    <p className="text-base">{supplier.contactPerson}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
                      {supplier.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-border pt-4" />
              
              <div className="space-y-3">
                <h4 className="font-medium">Contato</h4>
                <div className="space-y-2">
                  {supplier.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{formatPhone(supplier.phone)}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{supplier.email}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{supplier.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Avaliação e Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Avaliação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className={`text-lg font-semibold ${getRatingColor(supplier.rating)}`}>
                    {supplier.rating.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({formatRating(supplier.rating)})
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categorias */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Categorias
              </CardTitle>
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
                <p className="text-muted-foreground">Nenhuma categoria definida</p>
              )}
            </CardContent>
          </Card>

          {/* Notas */}
          {supplier.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Datas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações de Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Cadastrado em:</span>
                    <p className="font-medium">
                      {new Date(supplier.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Atualizado em:</span>
                    <p className="font-medium">
                      {new Date(supplier.updatedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}