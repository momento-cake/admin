'use client'

import { Card, CardContent } from '@/components/ui/card'
import { usePermissions } from '@/hooks/usePermissions'
import { FeatureKey, ActionKey } from '@/lib/permissions'
import { LucideIcon, UserPlus, ClipboardPlus, PackagePlus, Clock, Users, CalendarHeart, Image, CalendarDays, ShoppingBag, ClipboardList, CookingPot, Settings, UserCog, Leaf, Package } from 'lucide-react'
import Link from 'next/link'

interface Shortcut {
  label: string
  description: string
  href: string
  icon: LucideIcon
  feature: FeatureKey
  action: ActionKey
  /** Lower number = higher priority per role. Unset = not shown for that role. */
  rolePriority: Partial<Record<string, number>>
}

/**
 * All available shortcuts. Each shortcut defines which feature+action it requires,
 * and a priority per role so the most relevant ones appear first.
 * Custom permissions are respected: if an admin grants 'orders' to an atendente,
 * order shortcuts will appear for them too.
 */
const ALL_SHORTCUTS: Shortcut[] = [
  // === CREATE actions ===
  {
    label: 'Novo Pedido',
    description: 'Criar um novo pedido',
    href: '/orders/new',
    icon: ClipboardPlus,
    feature: 'orders',
    action: 'create',
    rolePriority: { admin: 1, atendente: 1 },
  },
  {
    label: 'Novo Cliente',
    description: 'Cadastrar novo cliente',
    href: '/clients/new',
    icon: UserPlus,
    feature: 'clients',
    action: 'create',
    rolePriority: { admin: 2, atendente: 2 },
  },
  {
    label: 'Novo Produto',
    description: 'Adicionar produto ao catálogo',
    href: '/products/new',
    icon: PackagePlus,
    feature: 'products',
    action: 'create',
    rolePriority: { admin: 3 },
  },
  {
    label: 'Nova Receita',
    description: 'Criar uma nova receita',
    href: '/recipes',
    icon: CookingPot,
    feature: 'recipes',
    action: 'create',
    rolePriority: { admin: 5 },
  },
  {
    label: 'Novo Ingrediente',
    description: 'Cadastrar ingrediente',
    href: '/ingredients/new',
    icon: Leaf,
    feature: 'ingredients',
    action: 'create',
    rolePriority: { admin: 7 },
  },
  {
    label: 'Registrar Ponto',
    description: 'Registrar entrada ou saída',
    href: '/ponto/registro',
    icon: Clock,
    feature: 'time_tracking',
    action: 'create',
    rolePriority: { admin: 8, atendente: 7, producao: 1 },
  },

  // === VIEW / NAVIGATE actions ===
  {
    label: 'Pedidos',
    description: 'Ver todos os pedidos',
    href: '/orders',
    icon: ClipboardList,
    feature: 'orders',
    action: 'view',
    rolePriority: { admin: 4, atendente: 3 },
  },
  {
    label: 'Clientes',
    description: 'Ver todos os clientes',
    href: '/clients',
    icon: Users,
    feature: 'clients',
    action: 'view',
    rolePriority: { atendente: 4 },
  },
  {
    label: 'Datas Especiais',
    description: 'Aniversários e datas dos clientes',
    href: '/clients/special-dates',
    icon: CalendarHeart,
    feature: 'clients',
    action: 'view',
    rolePriority: { atendente: 5 },
  },
  {
    label: 'Galeria',
    description: 'Galeria de imagens de referência',
    href: '/images/gallery',
    icon: Image,
    feature: 'images',
    action: 'view',
    rolePriority: { atendente: 6 },
  },
  {
    label: 'Meu Espelho',
    description: 'Ver registros de ponto',
    href: '/ponto/espelho',
    icon: CalendarDays,
    feature: 'time_tracking',
    action: 'view',
    rolePriority: { atendente: 8, producao: 2 },
  },
  {
    label: 'Catálogo',
    description: 'Ver catálogo de produtos',
    href: '/products',
    icon: ShoppingBag,
    feature: 'products',
    action: 'view',
    rolePriority: { producao: 4 },
  },
  {
    label: 'Receitas',
    description: 'Ver receitas cadastradas',
    href: '/recipes',
    icon: CookingPot,
    feature: 'recipes',
    action: 'view',
    rolePriority: { producao: 3 },
  },
  {
    label: 'Embalagens',
    description: 'Estoque de embalagens',
    href: '/packaging/inventory',
    icon: Package,
    feature: 'packaging',
    action: 'view',
    rolePriority: { producao: 5 },
  },

  // === ADMIN only ===
  {
    label: 'Usuários',
    description: 'Gerenciar usuários e convites',
    href: '/users/active',
    icon: UserCog,
    feature: 'users',
    action: 'view',
    rolePriority: { admin: 6 },
  },
  {
    label: 'Configurações',
    description: 'Configurações do sistema',
    href: '/settings',
    icon: Settings,
    feature: 'settings',
    action: 'view',
    rolePriority: { admin: 9 },
  },
]

/**
 * Fallback priority for shortcuts that don't have a role-specific priority
 * but the user has custom permissions granting access.
 */
const FALLBACK_PRIORITY = 50

export function DashboardShortcuts() {
  const { role, canAccess, canPerformAction: canAction } = usePermissions()

  const visibleShortcuts = ALL_SHORTCUTS
    .filter((s) => {
      // Must have feature access
      if (!canAccess(s.feature)) return false
      // Must have the required action permission
      if (!canAction(s.feature, s.action)) return false
      return true
    })
    .map((s) => ({
      ...s,
      _priority: s.rolePriority[role] ?? FALLBACK_PRIORITY,
    }))
    .sort((a, b) => a._priority - b._priority)

  if (visibleShortcuts.length === 0) return null

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3">Atalhos</h2>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {visibleShortcuts.map((shortcut) => (
          <ShortcutCard key={shortcut.href + shortcut.label} shortcut={shortcut} />
        ))}
      </div>
    </div>
  )
}

function ShortcutCard({ shortcut }: { shortcut: Shortcut }) {
  const Icon = shortcut.icon

  return (
    <Link href={shortcut.href} className="block group">
      <Card className="h-full transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 group-hover:border-primary/30">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="shrink-0 rounded-lg bg-primary/10 p-2.5 transition-colors group-hover:bg-primary/20">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{shortcut.label}</p>
            <p className="text-xs text-muted-foreground truncate">{shortcut.description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
