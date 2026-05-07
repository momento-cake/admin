'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarHeart,
  CircleUserRound,
  Facebook,
  FileText,
  IdCard,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Tag,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react'
import { Client, ContactMethodType } from '@/types/client'
import { usePermissions } from '@/hooks/usePermissions'

/**
 * Robust date parser handling all four shapes the codebase emits over the wire:
 *  - Firestore client SDK Timestamp `{ toDate(): Date }`
 *  - Firestore admin SDK serialized `{ _seconds, _nanoseconds }`
 *  - Firestore plain JSON `{ seconds, nanoseconds }`
 *  - ISO string / number / Date
 * Returns `null` when the value is missing or produces an Invalid Date.
 */
function toDateLoose(value: unknown): Date | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const v = value as {
    toDate?: () => Date
    _seconds?: number
    seconds?: number
  }
  if (typeof v.toDate === 'function') {
    const d = v.toDate()
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null
  }
  if (typeof v._seconds === 'number') {
    const d = new Date(v._seconds * 1000)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof v.seconds === 'number') {
    const d = new Date(v.seconds * 1000)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function formatFullDate(value: unknown): string {
  const d = toDateLoose(value)
  if (!d) return 'Data inválida'
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatRelative(value: unknown): string | null {
  const d = toDateLoose(value)
  if (!d) return null
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR })
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const CONTACT_TYPE_LABELS: Record<ContactMethodType, string> = {
  phone: 'Telefone',
  email: 'Email',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  other: 'Outro',
}

function ContactTypeIcon({ type, className }: { type: ContactMethodType; className?: string }) {
  switch (type) {
    case 'phone':
      return <Phone className={className} />
    case 'email':
      return <Mail className={className} />
    case 'whatsapp':
      return <MessageCircle className={className} />
    case 'instagram':
      return <Instagram className={className} />
    case 'facebook':
      return <Facebook className={className} />
    case 'linkedin':
      return <Linkedin className={className} />
    default:
      return <CircleUserRound className={className} />
  }
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  child: 'Filho(a)',
  parent: 'Pai/Mãe',
  sibling: 'Irmão/Irmã',
  friend: 'Amigo(a)',
  spouse: 'Cônjuge',
  other: 'Outro',
}

const SPECIAL_DATE_META: Record<
  string,
  { emoji: string; label: string }
> = {
  birthday: { emoji: '🎂', label: 'Aniversário' },
  anniversary: { emoji: '💍', label: 'Bodas' },
  custom: { emoji: '📅', label: 'Data especial' },
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

interface QuickAction {
  key: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

function buildQuickActions(client: Client): QuickAction[] {
  const actions: QuickAction[] = []
  const seenHrefs = new Set<string>()

  const tryAdd = (action: QuickAction) => {
    if (seenHrefs.has(action.href)) return
    seenHrefs.add(action.href)
    actions.push(action)
  }

  if (client.phone) {
    tryAdd({
      key: `phone-${client.phone}`,
      label: 'Ligar',
      href: `tel:${digitsOnly(client.phone)}`,
      icon: Phone,
    })
  }
  if (client.email) {
    tryAdd({
      key: `email-${client.email}`,
      label: 'Email',
      href: `mailto:${client.email}`,
      icon: Mail,
    })
  }

  for (const cm of client.contactMethods ?? []) {
    if (!cm.value) continue
    if (cm.type === 'phone') {
      tryAdd({
        key: `cm-phone-${cm.id}`,
        label: 'Ligar',
        href: `tel:${digitsOnly(cm.value)}`,
        icon: Phone,
      })
    } else if (cm.type === 'whatsapp') {
      tryAdd({
        key: `cm-wa-${cm.id}`,
        label: 'WhatsApp',
        href: `https://wa.me/${digitsOnly(cm.value)}`,
        icon: MessageCircle,
      })
    } else if (cm.type === 'email') {
      tryAdd({
        key: `cm-email-${cm.id}`,
        label: 'Email',
        href: `mailto:${cm.value}`,
        icon: Mail,
      })
    }
  }

  return actions
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { canPerformAction } = usePermissions()
  const canUpdate = canPerformAction('clients', 'update')
  const canDelete = canPerformAction('clients', 'delete')

  useEffect(() => {
    fetchClient()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const quickActions = useMemo(
    () => (client ? buildQuickActions(client) : []),
    [client]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando...
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="space-y-6">
        <Link href="/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-destructive">
            {error || 'Cliente não encontrado'}
          </CardContent>
        </Card>
      </div>
    )
  }

  const isPerson = client.type === 'person'
  const initials = getInitials(client.name)
  const createdRelative = formatRelative(client.createdAt)
  const updatedRelative = client.updatedAt ? formatRelative(client.updatedAt) : null
  const sortedSpecialDates = client.specialDates
    ? [...client.specialDates].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
    : []

  return (
    <div className="space-y-6 pb-12">
      {/* Top toolbar */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/clients">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Clientes
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {canUpdate && (
            <Link href={`/clients/${clientId}/edit`}>
              <Button className="gap-2">
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </Link>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="icon"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Remover cliente"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Identity hero */}
      <Card className="overflow-hidden border-border/60">
        <div className="relative">
          {/* Decorative gold gradient strip */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-[#e8c87a]/40 via-[#d4a574]/25 to-transparent"
          />
          <CardContent className="relative pt-8 pb-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Monogram */}
              <div className="shrink-0">
                <div className="relative">
                  <div
                    aria-hidden
                    className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#e8c87a] via-[#d4a574] to-[#b8956a] opacity-70 blur-[2px]"
                  />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-card font-serif text-2xl font-semibold tracking-wide text-[#5c4a2e] ring-1 ring-[#d4a574]/40 shadow-sm">
                    {initials}
                  </div>
                </div>
              </div>

              {/* Identity */}
              <div className="min-w-0 flex-1 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="gap-1 border-[#d4a574]/40 bg-[#e8c87a]/10 text-[#5c4a2e]"
                    >
                      {isPerson ? (
                        <CircleUserRound className="h-3 w-3" />
                      ) : (
                        <Building2 className="h-3 w-3" />
                      )}
                      {isPerson ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    </Badge>
                    {client.isActive === false && (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </div>
                  <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {client.name}
                  </h1>
                  {!isPerson && 'companyInfo' in client && client.companyInfo?.companyName && (
                    <p className="text-sm text-muted-foreground">
                      {client.companyInfo.companyName}
                    </p>
                  )}
                </div>

                {/* Quick actions */}
                {quickActions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {quickActions.map((action) => {
                      const Icon = action.icon
                      const isExternal = action.href.startsWith('http')
                      return (
                        <a
                          key={action.key}
                          href={action.href}
                          target={isExternal ? '_blank' : undefined}
                          rel={isExternal ? 'noopener noreferrer' : undefined}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-all hover:border-[#d4a574] hover:bg-[#e8c87a]/10 hover:text-[#5c4a2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {action.label}
                        </a>
                      )
                    })}
                  </div>
                )}

                {/* Inline metadata */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
                  {createdRelative && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      Criado {createdRelative}
                    </span>
                  )}
                  {updatedRelative && (
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden className="text-[#d4a574]">·</span>
                      Atualizado {updatedRelative}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Two-column body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — informações & contato (compact) */}
        <div className="space-y-6 lg:col-span-1">
          <SectionCard
            icon={<UserCheck className="h-4 w-4" />}
            title="Informações Básicas"
          >
            <DetailField label="Nome" value={client.name} />
            {client.email && <DetailField label="Email" value={client.email} mono />}
            {client.cpfCnpj && (
              <DetailField
                label={isPerson ? 'CPF' : 'CNPJ'}
                value={client.cpfCnpj}
                mono
              />
            )}
            {client.phone && <DetailField label="Telefone" value={client.phone} />}
          </SectionCard>

          {client.contactMethods && client.contactMethods.length > 0 && (
            <SectionCard
              icon={<Phone className="h-4 w-4" />}
              title="Métodos de Contato"
            >
              <div className="space-y-3">
                {client.contactMethods.map((m) => (
                  <div key={m.id} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8c87a]/15 text-[#5c4a2e]">
                      <ContactTypeIcon type={m.type} className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {CONTACT_TYPE_LABELS[m.type]}
                        </span>
                        {m.isPrimary && (
                          <Badge
                            variant="outline"
                            className="border-[#d4a574]/40 bg-[#e8c87a]/15 px-1.5 py-0 text-[10px] font-medium text-[#5c4a2e]"
                          >
                            Principal
                          </Badge>
                        )}
                      </div>
                      <p className="break-all text-sm text-foreground">{m.value}</p>
                      {m.notes && (
                        <p className="mt-0.5 text-xs italic text-muted-foreground">
                          {m.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {'companyInfo' in client && client.companyInfo && (
            <SectionCard
              icon={<Building2 className="h-4 w-4" />}
              title="Informações Empresariais"
            >
              <DetailField label="Empresa" value={client.companyInfo.companyName} />
              <DetailField label="CNPJ" value={client.companyInfo.cnpj} mono />
              {client.companyInfo.businessType && (
                <DetailField label="Tipo" value={client.companyInfo.businessType} />
              )}
              {client.companyInfo.inscricaoEstadual && (
                <DetailField
                  label="Inscrição Estadual"
                  value={client.companyInfo.inscricaoEstadual}
                  mono
                />
              )}
              {client.companyInfo.companyPhone && (
                <DetailField
                  label="Telefone da empresa"
                  value={client.companyInfo.companyPhone}
                />
              )}
              {client.companyInfo.companyEmail && (
                <DetailField
                  label="Email da empresa"
                  value={client.companyInfo.companyEmail}
                  mono
                />
              )}
            </SectionCard>
          )}

          {'representative' in client && client.representative && (
            <SectionCard
              icon={<IdCard className="h-4 w-4" />}
              title="Representante"
            >
              <DetailField label="Nome" value={client.representative.name} />
              <DetailField label="Email" value={client.representative.email} mono />
              <DetailField label="Telefone" value={client.representative.phone} />
              {client.representative.role && (
                <DetailField label="Cargo" value={client.representative.role} />
              )}
              {client.representative.cpf && (
                <DetailField label="CPF" value={client.representative.cpf} mono />
              )}
            </SectionCard>
          )}
        </div>

        {/* Right column — endereços, listas, notas */}
        <div className="space-y-6 lg:col-span-2">
          {client.addresses && client.addresses.length > 0 && (
            <SectionCard
              icon={<MapPin className="h-4 w-4" />}
              title="Endereços"
              subtitle={
                client.addresses.length === 1
                  ? '1 endereço cadastrado'
                  : `${client.addresses.length} endereços cadastrados`
              }
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {client.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="rounded-lg border border-border/60 bg-muted/30 p-4 transition-colors hover:border-[#d4a574]/40 hover:bg-[#e8c87a]/5"
                  >
                    {addr.label && (
                      <Badge
                        variant="outline"
                        className="mb-2 border-[#d4a574]/40 bg-[#e8c87a]/10 text-[#5c4a2e]"
                      >
                        {addr.label}
                      </Badge>
                    )}
                    <div className="space-y-0.5 text-sm">
                      {addr.endereco && (
                        <p className="font-medium text-foreground">
                          {addr.endereco}
                          {addr.numero ? `, ${addr.numero}` : ''}
                        </p>
                      )}
                      {addr.complemento && (
                        <p className="text-muted-foreground">{addr.complemento}</p>
                      )}
                      {addr.bairro && (
                        <p className="text-muted-foreground">{addr.bairro}</p>
                      )}
                      {(addr.cidade || addr.estado) && (
                        <p className="text-muted-foreground">
                          {addr.cidade}
                          {addr.cidade && addr.estado ? ' · ' : ''}
                          {addr.estado}
                        </p>
                      )}
                      {addr.cep && (
                        <p className="font-mono text-xs text-muted-foreground">
                          CEP {addr.cep}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {client.relatedPersons && client.relatedPersons.length > 0 && (
            <SectionCard
              icon={<Users className="h-4 w-4" />}
              title="Pessoas Relacionadas"
              subtitle={`${client.relatedPersons.length} ${client.relatedPersons.length === 1 ? 'pessoa' : 'pessoas'}`}
            >
              <div className="space-y-3">
                {client.relatedPersons.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card font-serif text-xs font-semibold text-[#5c4a2e] ring-1 ring-[#d4a574]/30">
                      {getInitials(person.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <p className="font-medium text-foreground">{person.name}</p>
                        <span className="text-xs text-muted-foreground">
                          {RELATIONSHIP_LABELS[person.relationship] ?? person.relationship}
                        </span>
                      </div>
                      {person.birthDate && (
                        <p className="text-xs text-muted-foreground">
                          Nascimento:{' '}
                          {new Date(person.birthDate).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {(person.email || person.phone) && (
                        <p className="text-xs text-muted-foreground">
                          {person.email}
                          {person.email && person.phone && ' · '}
                          {person.phone}
                        </p>
                      )}
                      {person.notes && (
                        <p className="mt-1 text-xs italic text-muted-foreground">
                          {person.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {sortedSpecialDates.length > 0 && (
            <SectionCard
              icon={<CalendarHeart className="h-4 w-4" />}
              title="Datas Especiais"
              subtitle={`${sortedSpecialDates.length} ${sortedSpecialDates.length === 1 ? 'data' : 'datas'}`}
            >
              <div className="space-y-2">
                {sortedSpecialDates.map((date) => {
                  const meta = SPECIAL_DATE_META[date.type] ?? SPECIAL_DATE_META.custom
                  return (
                    <div
                      key={date.id}
                      className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
                    >
                      <div
                        aria-hidden
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8c87a]/15 text-lg"
                      >
                        {meta.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">
                          {date.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="uppercase tracking-wide">{meta.label}</span>
                          <span className="text-[#d4a574]"> · </span>
                          {new Date(date.date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                          })}
                        </p>
                        {date.notes && (
                          <p className="mt-0.5 text-xs italic text-muted-foreground">
                            {date.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          )}

          {client.tags && client.tags.length > 0 && (
            <SectionCard icon={<Tag className="h-4 w-4" />} title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {client.tags.map((tag, idx) => (
                  <span
                    key={`${tag}-${idx}`}
                    className="inline-flex items-center rounded-full border border-[#d4a574]/40 bg-[#e8c87a]/10 px-2.5 py-1 text-xs font-medium text-[#5c4a2e]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          {client.notes && (
            <SectionCard icon={<FileText className="h-4 w-4" />} title="Notas">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {client.notes}
              </p>
            </SectionCard>
          )}
        </div>
      </div>

      {/* Footer metadata */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
        <span>
          Criado em {formatFullDate(client.createdAt)}
          {createdRelative && <span className="ml-1">({createdRelative})</span>}
        </span>
        {client.updatedAt && (
          <>
            <Separator orientation="vertical" className="h-3" />
            <span>
              Última atualização {formatFullDate(client.updatedAt)}
              {updatedRelative && <span className="ml-1">({updatedRelative})</span>}
            </span>
          </>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja remover{' '}
              <span className="font-medium text-foreground">{client.name}</span>?
              Esta ação pode ser desfeita posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
              className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {deleting ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/**
 * Sectioned card with a leading icon chip and an optional subtitle.
 * Keeps section headers consistent across the page.
 */
function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8c87a]/15 text-[#5c4a2e]"
          >
            {icon}
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  )
}

/**
 * Label/value field with consistent typography.
 * `mono` flag for IDs, emails, document numbers.
 */
function DetailField({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <p
        className={`break-words text-sm text-foreground ${
          mono ? 'font-mono text-[13px]' : ''
        }`}
      >
        {value}
      </p>
    </div>
  )
}
