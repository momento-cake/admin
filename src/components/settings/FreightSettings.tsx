'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Truck } from 'lucide-react'
import { fetchStoreSettings, updateStoreSettings } from '@/lib/store-settings'
import { useAuth } from '@/hooks/useAuth'
import { formatErrorMessage } from '@/lib/error-handler'

export function FreightSettings() {
  const { userModel } = useAuth()
  const [custoPorKm, setCustoPorKm] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const settings = await fetchStoreSettings()
        setCustoPorKm(settings.custoPorKm.toFixed(2).replace('.', ','))
      } catch (error) {
        toast.error('Erro ao carregar configurações', {
          description: formatErrorMessage(error),
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const parseValue = (value: string): number => {
    // Accept both comma and dot as decimal separator
    const normalized = value.replace(',', '.')
    const num = parseFloat(normalized)
    return isNaN(num) ? 0 : num
  }

  const numericValue = parseValue(custoPorKm)

  const handleSave = async () => {
    if (numericValue <= 0) {
      toast.error('O custo por km deve ser maior que zero')
      return
    }

    setSaving(true)
    try {
      await updateStoreSettings({
        custoPorKm: numericValue,
        updatedBy: userModel?.uid || '',
      })
      toast.success('Configuração de frete salva com sucesso!')
    } catch (error) {
      toast.error('Erro ao salvar configuração', {
        description: formatErrorMessage(error),
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const exampleDistance = 10
  const exampleTotal = exampleDistance * numericValue

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Custo por Quilômetro
        </CardTitle>
        <CardDescription>
          Define o valor cobrado por quilômetro para entregas. Este valor é usado como padrão ao calcular o frete de um pedido.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="custoPorKm">Custo por km (R$)</Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">R$</span>
            <Input
              id="custoPorKm"
              value={custoPorKm}
              onChange={(e) => setCustoPorKm(e.target.value)}
              placeholder="4,50"
              className="max-w-[180px]"
            />
          </div>
        </div>

        {numericValue > 0 && (
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Exemplo:</strong> {exampleDistance} km &times; R$ {numericValue.toFixed(2).replace('.', ',')} = <strong className="text-foreground">R$ {exampleTotal.toFixed(2).replace('.', ',')}</strong>
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || numericValue <= 0}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
