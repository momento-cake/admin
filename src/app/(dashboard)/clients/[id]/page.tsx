'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import { Client } from '@/types/client'

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    fetchClient()
  }, [clientId])

  const fetchClient = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${clientId}`)
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Erro')
      setClient(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      const response = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Erro')
      router.push('/clients')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) return <div className="p-12 text-center text-muted-foreground">Carregando...</div>
  if (error || !client) return (
    <div className="space-y-6">
      <Link href="/clients">
        <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
      </Link>
      <div className="p-4 text-destructive">{error || 'Não encontrado'}</div>
    </div>
  )

  const formatDate = (date: any) => {
    try {
      const d = date.toDate?.() || new Date(date)
      return d.toLocaleDateString('pt-BR')
    } catch {
      return 'Data inválida'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/clients">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            <p className="text-muted-foreground">{client.type === 'person' ? 'Pessoa Física' : 'Pessoa Jurídica'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/clients/${clientId}/edit`}><Button>Editar</Button></Link>
          <Button variant="destructive" size="icon" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-sm w-full mx-4">
            <h2 className="text-xl font-semibold mb-2">Remover Cliente?</h2>
            <p className="text-muted-foreground mb-6">Tem certeza? Esta ação pode ser desfeita.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1 gap-2" onClick={handleDelete} disabled={deleting}>
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {deleting ? 'Removendo...' : 'Remover'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Informações Básicas</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Nome</label>
              <p className="text-foreground">{client.name}</p>
            </div>
            {client.email && (
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <p className="text-foreground">{client.email}</p>
              </div>
            )}
            {client.cpfCnpj && (
              <div>
                <label className="text-sm text-muted-foreground">{client.type === 'person' ? 'CPF' : 'CNPJ'}</label>
                <p className="text-foreground">{client.cpfCnpj}</p>
              </div>
            )}
            {client.phone && (
              <div>
                <label className="text-sm text-muted-foreground">Telefone</label>
                <p className="text-foreground">{client.phone}</p>
              </div>
            )}
          </div>
        </div>

        {client.contactMethods && client.contactMethods.length > 0 && (
          <div className="p-6 border rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Métodos de Contato</h2>
            <div className="space-y-3">
              {client.contactMethods.map(m => (
                <div key={m.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground capitalize">{m.type}</p>
                    {m.isPrimary && <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">Principal</span>}
                  </div>
                  <p className="text-muted-foreground">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {client.address && Object.values(client.address).some(v => v) && (
          <div className="p-6 border rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Endereço</h2>
            <div className="space-y-2 text-sm">
              {client.address.endereco && <p className="text-foreground">{client.address.endereco}, {client.address.numero}</p>}
              {client.address.complemento && <p className="text-muted-foreground">{client.address.complemento}</p>}
              {client.address.bairro && <p className="text-muted-foreground">{client.address.bairro}</p>}
              {(client.address.cidade || client.address.estado) && (
                <p className="text-muted-foreground">{client.address.cidade}{client.address.cidade && client.address.estado ? ', ' : ''}{client.address.estado}</p>
              )}
              {client.address.cep && <p className="text-muted-foreground">{client.address.cep}</p>}
            </div>
          </div>
        )}

        {'companyInfo' in client && client.companyInfo && (
          <div className="p-6 border rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Informações Empresariais</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Empresa</label>
                <p className="text-foreground">{client.companyInfo.companyName}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">CNPJ</label>
                <p className="text-foreground">{client.companyInfo.cnpj}</p>
              </div>
              {client.companyInfo.businessType && (
                <div>
                  <label className="text-sm text-muted-foreground">Tipo</label>
                  <p className="text-foreground">{client.companyInfo.businessType}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {'representative' in client && client.representative && (
          <div className="p-6 border rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Representante</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Nome</label>
                <p className="text-foreground">{client.representative.name}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <p className="text-foreground">{client.representative.email}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Telefone</label>
                <p className="text-foreground">{client.representative.phone}</p>
              </div>
              {client.representative.role && (
                <div>
                  <label className="text-sm text-muted-foreground">Cargo</label>
                  <p className="text-foreground">{client.representative.role}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {client.tags && client.tags.length > 0 && (
        <div className="p-6 border rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {client.tags.map((tag, idx) => (
              <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {client.relatedPersons && client.relatedPersons.length > 0 && (
        <div className="p-6 border rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Pessoas Relacionadas</h2>
          <div className="space-y-4">
            {client.relatedPersons.map(person => (
              <div key={person.id} className="border rounded p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">{person.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{person.relationship}</p>
                    {person.birthDate && (
                      <p className="text-sm text-muted-foreground">Nascimento: {new Date(person.birthDate).toLocaleDateString('pt-BR')}</p>
                    )}
                    {(person.email || person.phone) && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {person.email && <span>{person.email}</span>}
                        {person.email && person.phone && <span> • </span>}
                        {person.phone && <span>{person.phone}</span>}
                      </div>
                    )}
                    {person.notes && (
                      <p className="text-sm italic text-muted-foreground mt-1">{person.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {client.specialDates && client.specialDates.length > 0 && (
        <div className="p-6 border rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Datas Especiais</h2>
          <div className="space-y-3">
            {client.specialDates
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map(date => (
                <div key={date.id} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                  <div className="text-2xl pt-1">
                    {date.type === 'birthday' && '🎂'}
                    {date.type === 'anniversary' && '💍'}
                    {date.type === 'custom' && '📅'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{date.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(date.date).toLocaleDateString('pt-BR')}
                    </p>
                    {date.notes && (
                      <p className="text-sm italic text-muted-foreground mt-1">{date.notes}</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {client.notes && (
        <div className="p-6 border rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Notas</h2>
          <p className="text-foreground whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      <div className="text-sm text-muted-foreground border-t pt-4">
        <p>Criado em: {formatDate(client.createdAt)}</p>
        {client.updatedAt && <p>Última atualização: {formatDate(client.updatedAt)}</p>}
      </div>
    </div>
  )
}
