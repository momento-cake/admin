'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, StatCard } from '@/components/ui/empty-state'
import { useAuth } from '@/hooks/useAuth'
import {
  Users,
  ShoppingBag,
  Package,
  ChefHat,
  Activity,
  Tag
} from 'lucide-react'

interface DashboardStats {
  users: number
  clients: number
  ingredients: number
  recipes: number
  products: number
}

interface Activity {
  id: string
  type: string
  message: string
  timestamp: Date
  status: 'success' | 'info' | 'warning' | 'error'
}

export default function DashboardPage() {
  const { userModel } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({ users: 0, clients: 0, ingredients: 0, recipes: 0, products: 0 })
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const res = await fetch('/api/dashboard/stats')
        const data = await res.json()
        if (data.success) {
          setStats(data.stats)
        }
        setActivities([])
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  if (!userModel) return null
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-2"></div>
          <div className="h-4 bg-muted rounded w-64"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo, {userModel.displayName || userModel.email}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Usuários"
          value={stats.users}
          icon={Users}
          description="Usuários cadastrados"
          href={userModel.role.type === 'admin' ? '/users' : undefined}
        />
        <StatCard
          title="Clientes"
          value={stats.clients}
          icon={ShoppingBag}
          description="Clientes cadastrados"
          href="/clients"
        />
        <StatCard
          title="Produtos"
          value={stats.products}
          icon={Tag}
          description="Produtos no catálogo"
          href="/products"
        />
        <StatCard
          title="Ingredientes"
          value={stats.ingredients}
          icon={Package}
          description="Ingredientes no catálogo"
          href="/ingredients"
        />
        <StatCard
          title="Receitas"
          value={stats.recipes}
          icon={ChefHat}
          description="Receitas criadas"
          href="/recipes"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activities */}
        {activities.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Atividades Recentes</CardTitle>
              <CardDescription>
                Últimas atividades do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'success' ? 'bg-success' :
                    activity.status === 'info' ? 'bg-info' :
                    activity.status === 'warning' ? 'bg-warning' : 'bg-destructive'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={Activity}
            title="Nenhuma Atividade"
            description="Quando você começar a usar o sistema, as atividades aparecerão aqui."
          />
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Comece adicionando dados ao seu sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.clients === 0 && (
              <EmptyState
                icon={ShoppingBag}
                title="Adicionar Primeiro Cliente"
                description="Comece cadastrando seu primeiro cliente"
                action={{
                  label: "Adicionar Cliente",
                  href: "/clients"
                }}
                className="border-0 shadow-none p-4"
              />
            )}
            {stats.ingredients === 0 && (
              <EmptyState
                icon={Package}
                title="Cadastrar Ingredientes"
                description="Adicione ingredientes para criar suas receitas"
                action={{
                  label: "Adicionar Ingrediente",
                  href: "/ingredients"
                }}
                className="border-0 shadow-none p-4"
              />
            )}
            {stats.recipes === 0 && stats.ingredients > 0 && (
              <EmptyState
                icon={ChefHat}
                title="Criar Primeira Receita"
                description="Use seus ingredientes para criar receitas"
                action={{
                  label: "Criar Receita",
                  href: "/recipes"
                }}
                className="border-0 shadow-none p-4"
              />
            )}
            {stats.clients > 0 && stats.recipes > 0 && (
              <div className="text-center py-8">
                <div className="text-2xl mb-2">🎉</div>
                <h3 className="font-semibold text-foreground">Sistema Configurado!</h3>
                <p className="text-sm text-muted-foreground">
                  Você já tem clientes e receitas cadastrados. Explore os relatórios!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}