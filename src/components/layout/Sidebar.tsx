'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { FeatureKey } from '@/lib/permissions'
import { ROLE_LABELS } from '@/types'
import {
  Users,
  Package,
  LogOut,
  Home,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Mail,
  Truck,
  ChefHat,
  DollarSign,
  UserCheck,
  Calendar,
  FolderOpen,
  Image,
  Tag,
  Clock,
  PlayCircle,
  Settings,
  MapPin,
  ShoppingCart,
  Plus,
  LayoutGrid,
  MessageCircle
} from 'lucide-react'

interface NavSubmenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  feature?: FeatureKey;
  adminOnly?: boolean;
  hasSubmenu?: boolean;
  submenu?: NavSubmenuItem[];
}

interface NavItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  feature: FeatureKey;
  hasSubmenu?: boolean;
  submenu?: NavSubmenuItem[];
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    feature: 'dashboard'
  },
  {
    name: 'Usuários',
    icon: Users,
    feature: 'users',
    hasSubmenu: true,
    submenu: [
      {
        name: 'Usuários Ativos',
        href: '/users/active',
        icon: UserPlus
      },
      {
        name: 'Convites',
        href: '/users/invitations',
        icon: Mail
      }
    ]
  },
  {
    name: 'Produtos',
    icon: Package,
    feature: 'products',
    hasSubmenu: true,
    submenu: [
      {
        name: 'Catálogo',
        href: '/products',
        icon: Package
      },
      {
        name: 'Receitas',
        href: '/recipes',
        icon: ChefHat,
        feature: 'recipes'
      },
      {
        name: 'Categorias de Produtos',
        href: '/products/categories',
        icon: FolderOpen
      },
      {
        name: 'Ingredientes',
        href: '/ingredients/inventory',
        icon: Package,
        feature: 'ingredients'
      },
      {
        name: 'Fornecedores',
        href: '/ingredients/suppliers',
        icon: Truck,
        feature: 'ingredients'
      },
      {
        name: 'Embalagens',
        href: '/packaging/inventory',
        icon: Package,
        feature: 'packaging'
      },
      {
        name: 'Análise de Custos',
        href: '/recipes/costs',
        icon: DollarSign,
        feature: 'recipes'
      }
    ]
  },
  {
    name: 'Clientes',
    icon: UserCheck,
    feature: 'clients',
    hasSubmenu: true,
    submenu: [
      {
        name: 'Todos os Clientes',
        href: '/clients',
        icon: UserCheck
      },
      {
        name: 'Datas Especiais',
        href: '/clients/special-dates',
        icon: Calendar
      }
    ]
  },
  {
    name: 'Pedidos',
    icon: ShoppingCart,
    feature: 'orders' as FeatureKey,
    hasSubmenu: true,
    submenu: [
      {
        name: 'Todos os Pedidos',
        href: '/orders',
        icon: ShoppingCart
      },
      {
        name: 'Quadro Kanban',
        href: '/orders/kanban',
        icon: LayoutGrid
      },
      {
        name: 'Novo Pedido',
        href: '/orders/new',
        icon: Plus
      }
    ]
  },
  {
    name: 'WhatsApp',
    icon: MessageCircle,
    feature: 'whatsapp',
    hasSubmenu: true,
    submenu: [
      {
        name: 'Conversas',
        href: '/whatsapp',
        icon: MessageCircle
      },
      {
        name: 'Configuração',
        href: '/whatsapp/settings',
        icon: Settings
      }
    ]
  },
  {
    name: 'Imagens',
    icon: Image,
    feature: 'images',
    hasSubmenu: true,
    submenu: [
      {
        name: 'Galeria',
        href: '/images/gallery',
        icon: Image
      },
      {
        name: 'Pastas',
        href: '/images/folders',
        icon: FolderOpen
      },
      {
        name: 'Gerenciar Tags',
        href: '/images/tags',
        icon: Tag
      }
    ]
  },
  {
    name: 'Ponto',
    icon: Clock,
    feature: 'time_tracking',
    hasSubmenu: true,
    submenu: [
      {
        name: 'Registro',
        href: '/ponto/registro',
        icon: PlayCircle
      },
      {
        name: 'Meu Espelho',
        href: '/ponto/espelho',
        icon: Calendar
      },
      {
        name: 'Painel Admin',
        href: '/ponto/admin',
        icon: Users,
        adminOnly: true
      },
      {
        name: 'Configurações',
        href: '/ponto/configuracoes',
        icon: Settings,
        adminOnly: true
      }
    ]
  },
  {
    name: 'Configurações',
    icon: Settings,
    feature: 'settings' as FeatureKey,
    hasSubmenu: true,
    submenu: [
      {
        name: 'Geral',
        href: '/settings',
        icon: Settings
      },
      {
        name: 'Endereços da Loja',
        href: '/settings/store-addresses',
        icon: MapPin
      },
      {
        name: 'Frete',
        href: '/settings/freight',
        icon: Truck
      },
      {
        name: 'Horários',
        href: '/settings/store-hours',
        icon: Clock
      }
    ]
  }
]

export function Sidebar() {
  const rawPathname = usePathname()
  // Normalize: strip trailing slash for consistent comparison with href values
  const pathname = rawPathname.replace(/\/$/, '') || '/'
  const { userModel, logout } = useAuth()
  const { canAccess, role } = usePermissions()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  if (!userModel) return null

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  const isExpanded = (itemName: string) => expandedItems.includes(itemName)

  const isActiveSubmenu = (item: any) => {
    if (!item.submenu) return false
    return item.submenu.some((subItem: any) => {
      if (subItem.href) {
        return pathname === subItem.href
      }
      if (subItem.submenu) {
        return subItem.submenu.some((nestedItem: any) => pathname === nestedItem.href)
      }
      return false
    })
  }

  return (
    <div className="flex w-64 flex-col h-full">
      <div className="flex flex-col flex-1 pt-5 overflow-y-auto bg-sidebar border-r border-sidebar-border">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl text-sidebar-foreground">
            <span className="text-sidebar-primary font-bold">Momento Cake</span>{' '}
            <span className="text-sidebar-foreground/50 font-normal">Admin</span>
          </h1>
        </div>

        <div className="mt-8 flex-grow flex flex-col">
          <nav className="flex-1 px-2 pb-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const hasSubmenu = item.hasSubmenu && item.submenu
              const expanded = isExpanded(item.name)
              const hasAccess = canAccess(item.feature)

              // Filter submenu items by feature access and admin-only flag
              const accessibleSubmenu = hasSubmenu
                ? item.submenu!.filter((subItem) => {
                    if (subItem.adminOnly && role !== 'admin') return false
                    return subItem.feature ? canAccess(subItem.feature) : true
                  })
                : undefined

              // Hide parent if it has a submenu but no accessible children
              if (hasSubmenu && accessibleSubmenu!.length === 0) {
                return null
              }

              const isActive = item.href ? pathname === item.href : isActiveSubmenu(item)

              // Hide menu items the user cannot access
              if (!hasAccess) {
                return null
              }

              return (
                <div key={item.name}>
                  {hasSubmenu ? (
                    <button
                      onClick={() => toggleExpanded(item.name)}
                      className={cn(
                        'group flex items-center justify-between w-full px-2 py-2 text-sm font-medium rounded-md transition-colors',
                        isActive || expanded
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <div className="flex items-center">
                        <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                        {item.name}
                      </div>
                      {expanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.href!}
                      className={cn(
                        'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      {item.name}
                    </Link>
                  )}
                  
                  {/* Submenu */}
                  {hasSubmenu && expanded && accessibleSubmenu && (
                    <div className="ml-6 mt-1 space-y-1">
                      {accessibleSubmenu.map((subItem) => {
                        const SubIcon = subItem.icon
                        const isSubActive = pathname === subItem.href
                        const hasNestedSubmenu = subItem.hasSubmenu && subItem.submenu
                        const isNestedExpanded = isExpanded(subItem.name)
                        const isNestedActive = hasNestedSubmenu && subItem.submenu?.some((nestedItem: { href: string }) => pathname === nestedItem.href)
                        
                        return (
                          <div key={subItem.name}>
                            {hasNestedSubmenu ? (
                              <button
                                onClick={() => toggleExpanded(subItem.name)}
                                className={cn(
                                  'group flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
                                  isNestedActive || isNestedExpanded
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                                )}
                              >
                                <div className="flex items-center">
                                  <SubIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                  {subItem.name}
                                </div>
                                {isNestedExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </button>
                            ) : (
                              <Link
                                href={subItem.href}
                                className={cn(
                                  'group flex items-center px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
                                  isSubActive
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_0_var(--sidebar-primary)] pl-1.5'
                                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                                )}
                              >
                                <SubIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                {subItem.name}
                              </Link>
                            )}
                            
                            {/* Nested submenu */}
                            {hasNestedSubmenu && isNestedExpanded && (
                              <div className="ml-6 mt-1 space-y-1">
                                {subItem.submenu!.map((nestedItem: any) => {
                                  const NestedIcon = nestedItem.icon
                                  const isNestedItemActive = pathname === nestedItem.href
                                  
                                  return (
                                    <Link
                                      key={nestedItem.name}
                                      href={nestedItem.href}
                                      className={cn(
                                        'group flex items-center px-2 py-1 text-xs font-medium rounded-md transition-colors',
                                        isNestedItemActive
                                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground'
                                      )}
                                    >
                                      <NestedIcon className="mr-2 h-3 w-3 flex-shrink-0" />
                                      {nestedItem.name}
                                    </Link>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
          
          <div className="px-2 pb-4">
            <div className="border-t border-sidebar-border pt-4">
              <div className="rounded-lg bg-sidebar-accent/50 p-3">
                <div className="text-xs text-sidebar-foreground/60">
                  {userModel.displayName || userModel.email}
                  <br />
                  <span className="text-sidebar-primary text-xs font-medium">
                    {ROLE_LABELS[role] || role}
                    {userModel.metadata?.isInitialAdmin && ' (Master)'}
                  </span>
                </div>
                <Button
                  onClick={logout}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent mt-2"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}