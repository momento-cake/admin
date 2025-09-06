'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import {
  Users,
  Package,
  LogOut,
  Home,
  Bell,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Mail,
  AlertTriangle,
  BarChart3,
  Calculator,
  DollarSign,
  Activity,
  TrendingUp,
  FileBarChart,
  Settings
} from 'lucide-react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    roles: ['admin', 'viewer']
  },
  {
    name: 'Usuários',
    icon: Users,
    roles: ['admin'],
    hasSubmenu: true,
    submenu: [
      {
        name: 'Usuários Ativos',
        href: '/users?tab=users',
        icon: UserPlus
      },
      {
        name: 'Convites',
        href: '/users?tab=invitations',
        icon: Mail
      }
    ]
  },
  {
    name: 'Ingredientes',
    icon: Package,
    roles: ['admin', 'viewer'],
    hasSubmenu: true,
    submenu: [
      {
        name: 'Inventário',
        href: '/ingredients?tab=inventory',
        icon: Package
      },
      {
        name: 'Alertas',
        href: '/ingredients?tab=alerts',
        icon: AlertTriangle
      },
      {
        name: 'Análise',
        href: '/ingredients?tab=analytics',
        icon: BarChart3
      },
      {
        name: 'Conversor',
        href: '/ingredients?tab=converter',
        icon: Calculator
      },
      {
        name: 'Preços',
        href: '/ingredients?tab=prices',
        icon: DollarSign
      },
      {
        name: 'Consumo',
        href: '/ingredients?tab=usage',
        icon: Activity
      },
      {
        name: 'Receitas',
        href: '/ingredients?tab=recipes',
        icon: TrendingUp
      },
      {
        name: 'Relatórios',
        href: '/ingredients?tab=reports',
        icon: FileBarChart
      },
      {
        name: 'Avançado',
        href: '/ingredients?tab=advanced',
        icon: Settings
      }
    ]
  }
]

export function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { userModel, logout } = useAuth()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  if (!userModel) return null

  const userRole = userModel.role.type
  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  )

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
      const url = new URL(subItem.href, 'http://localhost')
      const basePath = url.pathname
      const tabParam = url.searchParams.get('tab')
      return pathname === basePath && (!tabParam || searchParams.get('tab') === tabParam)
    })
  }

  return (
    <div className="flex w-full md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-sidebar border-r border-sidebar-border">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-sidebar-foreground">
            Momento Cake Admin
          </h1>
        </div>
        
        <div className="mt-8 flex-grow flex flex-col">
          <nav className="flex-1 px-2 pb-4 space-y-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              const isActive = item.href ? pathname === item.href : isActiveSubmenu(item)
              const hasSubmenu = item.hasSubmenu && item.submenu
              const expanded = isExpanded(item.name)
              
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
                  {hasSubmenu && expanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.submenu!.map((subItem) => {
                        const SubIcon = subItem.icon
                        const url = new URL(subItem.href, 'http://localhost')
                        const basePath = url.pathname
                        const tabParam = url.searchParams.get('tab')
                        const isSubActive = pathname === basePath && searchParams.get('tab') === tabParam
                        
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={cn(
                              'group flex items-center px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
                              isSubActive
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                            )}
                          >
                            <SubIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                            {subItem.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
          
          {/* Notifications */}
          <div className="px-2 pb-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent relative"
            >
              <Bell className="mr-3 h-4 w-4" />
              Notificações
              {/* Notification badge */}
              <span className="absolute right-2 h-4 w-4 rounded-full bg-destructive text-xs text-destructive-foreground flex items-center justify-center">
                3
              </span>
            </Button>
          </div>
          
          <div className="px-2 pb-4">
            <div className="border-t border-sidebar-border pt-4">
              <div className="px-2 py-2 text-xs text-sidebar-foreground/60">
                {userModel.displayName || userModel.email}
                <br />
                <span className="font-medium">
                  {getRoleDisplayName(userModel.role.type)}
                  {userModel.metadata?.isInitialAdmin && ' (Master)'}
                </span>
              </div>
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getRoleDisplayName(role: string): string {
  switch (role) {
    case 'admin':
      return 'Administrador'
    case 'viewer':
      return 'Visualizador'
    default:
      return role
  }
}