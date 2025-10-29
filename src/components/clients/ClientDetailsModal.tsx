'use client'

import { Button } from '@/components/ui/button'
import { Client } from '@/types/client'
import { X, Edit2 } from 'lucide-react'

interface ClientDetailsModalProps {
  client: Client
  onClose: () => void
  onEdit: (client: Client) => void
}

export function ClientDetailsModal({ client, onClose, onEdit }: ClientDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background">
          <h2 className="text-xl font-semibold text-foreground">Detalhes do Cliente</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Nome</label>
              <p className="font-medium text-foreground">{client.name}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Tipo</label>
              <p className="font-medium text-foreground">
                {client.type === 'person' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </p>
            </div>
            {client.email && (
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <p className="font-medium text-foreground">{client.email}</p>
              </div>
            )}
            {client.cpfCnpj && (
              <div>
                <label className="text-sm text-muted-foreground">{client.type === 'person' ? 'CPF' : 'CNPJ'}</label>
                <p className="font-medium text-foreground">{client.cpfCnpj}</p>
              </div>
            )}
            {client.phone && (
              <div>
                <label className="text-sm text-muted-foreground">Telefone</label>
                <p className="font-medium text-foreground">{client.phone}</p>
              </div>
            )}
          </div>

          {/* Contact Methods */}
          {client.contactMethods && client.contactMethods.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">Métodos de Contato</h3>
              <div className="space-y-2">
                {client.contactMethods.map(m => (
                  <div key={m.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground capitalize">{m.type}</span>
                      {m.isPrimary && <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">Principal</span>}
                    </div>
                    <p className="text-muted-foreground">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {client.tags && client.tags.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {client.tags.map((tag, idx) => (
                  <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Related Persons */}
          {client.relatedPersons && client.relatedPersons.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">Pessoas Relacionadas</h3>
              <div className="space-y-2">
                {client.relatedPersons.map(person => (
                  <div key={person.id} className="text-sm p-3 border border-border rounded">
                    <p className="font-medium text-foreground">{person.name}</p>
                    <p className="text-muted-foreground capitalize text-xs">{person.relationship}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">Notas</h3>
              <p className="text-foreground whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border sticky bottom-0 bg-background">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Fechar
          </Button>
          <Button className="flex-1" onClick={() => onEdit(client)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>
    </div>
  )
}
