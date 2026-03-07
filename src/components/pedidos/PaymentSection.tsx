'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  QrCode,
  CreditCard,
  Barcode,
  FileText,
  Copy,
  Check,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'

interface PaymentSectionProps {
  pedidoId: string
  total: number
}

export function PaymentSection({ total }: PaymentSectionProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [outrosDescricao, setOutrosDescricao] = useState('')
  const [pixCopied, setPixCopied] = useState(false)

  const formatPrice = (value: number) =>
    `R$ ${value.toFixed(2).replace('.', ',')}`

  const handlePixCopy = () => {
    // TODO: implement payment — PIX — replace with actual PIX key
    toast.info('Chave PIX será configurada em breve')
    setPixCopied(true)
    setTimeout(() => setPixCopied(false), 2000)
  }

  const handleCartao = () => {
    // TODO: implement payment processing — Cartão de Crédito
    toast.info('Pagamento com cartão será implementado em breve')
  }

  const handleBoleto = () => {
    // TODO: implement payment processing — Boleto
    toast.info('Geração de boleto será implementada em breve')
  }

  const handleOutros = () => {
    // TODO: implement payment processing — Outros
    if (!outrosDescricao.trim()) {
      toast.error('Informe uma descrição do pagamento')
      return
    }
    toast.info('Registro de pagamento manual será implementado em breve')
  }

  const methods = [
    {
      id: 'pix',
      label: 'PIX',
      icon: QrCode,
      description: 'Pagamento instantâneo via PIX',
    },
    {
      id: 'cartao',
      label: 'Cartão de Crédito',
      icon: CreditCard,
      description: 'Pagamento com cartão de crédito',
    },
    {
      id: 'boleto',
      label: 'Boleto',
      icon: Barcode,
      description: 'Gerar boleto bancário',
    },
    {
      id: 'outros',
      label: 'Outros',
      icon: FileText,
      description: 'Registro manual de pagamento',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pagamento
          </span>
          <Badge variant="outline" className="text-base font-semibold">
            {formatPrice(total)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Em Breve notice */}
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <div>
            <span className="text-sm font-medium">Em Breve</span>
            <p className="text-xs mt-0.5">Integração com formas de pagamento será disponibilizada em breve.</p>
          </div>
        </div>

        {/* Method selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {methods.map((method) => {
            const Icon = method.icon
            const isSelected = selectedMethod === method.id
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedMethod(isSelected ? null : method.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Icon className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>
                  {method.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* PIX details */}
        {selectedMethod === 'pix' && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-center">
                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                  <div className="text-center text-muted-foreground">
                    <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">QR Code PIX</p>
                    <p className="text-xs">(em breve)</p>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handlePixCopy}
              >
                {pixCopied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {pixCopied ? 'Copiado!' : 'Copiar Chave PIX'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Cartão details */}
        {selectedMethod === 'cartao' && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <Button type="button" className="w-full" onClick={handleCartao}>
                <CreditCard className="h-4 w-4 mr-2" />
                Pagar com Cartão — {formatPrice(total)}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Integração com gateway de pagamento em breve
              </p>
            </CardContent>
          </Card>
        )}

        {/* Boleto details */}
        {selectedMethod === 'boleto' && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <Button type="button" variant="outline" className="w-full" onClick={handleBoleto}>
                <Barcode className="h-4 w-4 mr-2" />
                Gerar Boleto — {formatPrice(total)}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Geração de boleto será implementada em breve
              </p>
            </CardContent>
          </Card>
        )}

        {/* Outros details */}
        {selectedMethod === 'outros' && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label htmlFor="outros-desc">Descrição do Pagamento</Label>
                <Input
                  id="outros-desc"
                  value={outrosDescricao}
                  onChange={(e) => setOutrosDescricao(e.target.value)}
                  placeholder="Ex: Transferência bancária, dinheiro, etc."
                />
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={handleOutros}>
                <FileText className="h-4 w-4 mr-2" />
                Registrar Pagamento
              </Button>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
