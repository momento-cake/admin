'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Truck, MapPin, Clock, ChevronRight } from 'lucide-react'

const settingsLinks = [
  {
    href: '/settings/freight',
    icon: Truck,
    title: 'Frete',
    description: 'Configure o custo por km e regras de frete para entregas',
  },
  {
    href: '/settings/store-addresses',
    icon: MapPin,
    title: 'Endereços da Loja',
    description: 'Gerencie os endereços de retirada e origem de entregas',
  },
  {
    href: '/settings/store-hours',
    icon: Clock,
    title: 'Horários de Funcionamento',
    description: 'Defina os horários de abertura e fechamento da loja',
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do sistema
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <item.icon className="h-5 w-5 text-primary" />
                    {item.title}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
