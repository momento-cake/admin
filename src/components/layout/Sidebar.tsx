'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import {
  Users,
  ShoppingBag,
  Package,
  ChefHat,
  BarChart3,
  Settings,
  LogOut,
  Home,
  Truck,
  User
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
    href: '/users',
    icon: Users,
    roles: ['admin']
  },
  {
    name: 'Clientes',
    href: '/clients',
    icon: ShoppingBag,
    roles: ['admin', 'viewer']
  },
  {
    name: 'Ingredientes',
    href: '/ingredients',
    icon: Package,
    roles: ['admin', 'viewer']
  },
  {
    name: 'Fornecedores',
    href: '/suppliers',
    icon: Truck,
    roles: ['admin', 'viewer']
  },
  {
    name: 'Receitas',
    href: '/recipes',
    icon: ChefHat,
    roles: ['admin', 'viewer']
  },
  {
    name: 'Relatórios',
    href: '/reports',
    icon: BarChart3,
    roles: ['admin', 'viewer']
  },
  {
    name: 'Configurações',
    href: '/settings',
    icon: Settings,
    roles: ['admin']
  },
  {
    name: 'Meu Perfil',
    href: '/profile',
    icon: User,
    roles: ['admin', 'viewer']
  }
]

export function Sidebar() {
  const pathname = usePathname()
  const { userModel, logout } = useAuth()

  if (!userModel) return null

  const userRole = userModel.role.type
  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  )

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
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
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
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
              )
            })}
          </nav>
          
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