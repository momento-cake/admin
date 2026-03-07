'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { Search, Loader2 } from 'lucide-react'
import { formatCEP } from '@/lib/masks'
import { StoreAddress } from '@/types/store-settings'

interface StoreAddressFormProps {
  address?: StoreAddress | null
  onSave: (data: {
    nome: string
    cep?: string
    estado?: string
    cidade?: string
    bairro?: string
    endereco?: string
    numero?: string
    complemento?: string
    isDefault: boolean
  }) => Promise<void>
  onCancel: () => void
  isSaving?: boolean
}

export function StoreAddressForm({
  address,
  onSave,
  onCancel,
  isSaving = false,
}: StoreAddressFormProps) {
  const [nome, setNome] = useState(address?.nome || '')
  const [cep, setCep] = useState(address?.cep || '')
  const [estado, setEstado] = useState(address?.estado || '')
  const [cidade, setCidade] = useState(address?.cidade || '')
  const [bairro, setBairro] = useState(address?.bairro || '')
  const [endereco, setEndereco] = useState(address?.endereco || '')
  const [numero, setNumero] = useState(address?.numero || '')
  const [complemento, setComplemento] = useState(address?.complemento || '')
  const [isDefault, setIsDefault] = useState(address?.isDefault ?? false)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState('')

  const cepNumbers = (cep || '').replace(/\D/g, '')
  const canSearchCep = cepNumbers.length === 8

  const handleCepSearch = async () => {
    if (!canSearchCep) return

    setCepLoading(true)
    setCepError('')

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepNumbers}/json/`)
      const data = await response.json()

      if (data.erro) {
        setCepError('CEP não encontrado')
        return
      }

      setEndereco(data.logradouro || endereco)
      setCidade(data.localidade || cidade)
      setEstado(data.uf || estado)
      setBairro(data.bairro || bairro)
    } catch {
      setCepError('Erro ao buscar CEP')
    } finally {
      setCepLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await onSave({
      nome,
      cep: cep || undefined,
      estado: estado || undefined,
      cidade: cidade || undefined,
      bairro: bairro || undefined,
      endereco: endereco || undefined,
      numero: numero || undefined,
      complemento: complemento || undefined,
      isDefault,
    })
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="nome">Nome do Endereço *</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Loja Principal, Filial Centro"
            required
          />
        </div>

        {/* CEP with search */}
        <div>
          <Label htmlFor="cep">CEP</Label>
          <div className="flex gap-2">
            <Input
              id="cep"
              value={cep}
              onChange={(e) => {
                setCepError('')
                setCep(formatCEP(e.target.value))
              }}
              placeholder="00000-000"
              maxLength={9}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCepSearch}
              disabled={!canSearchCep || cepLoading}
            >
              {cepLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2">Buscar</span>
            </Button>
          </div>
          {cepError && (
            <p className="text-sm text-destructive mt-1">{cepError}</p>
          )}
        </div>

        {/* Estado / Cidade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="estado">Estado</Label>
            <Input
              id="estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              placeholder="SP"
            />
          </div>
          <div>
            <Label htmlFor="cidade">Cidade</Label>
            <Input
              id="cidade"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
            />
          </div>
        </div>

        {/* Bairro */}
        <div>
          <Label htmlFor="bairro">Bairro</Label>
          <Input
            id="bairro"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
          />
        </div>

        {/* Endereço */}
        <div>
          <Label htmlFor="endereco">Endereço</Label>
          <Input
            id="endereco"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Rua, Avenida, etc"
          />
        </div>

        {/* Número / Complemento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="numero">Número</Label>
            <Input
              id="numero"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="complemento">Complemento</Label>
            <Input
              id="complemento"
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              placeholder="Apto, sala, etc"
            />
          </div>
        </div>

        {/* Default toggle */}
        <div className="flex items-center gap-3">
          <Switch
            id="isDefault"
            checked={isDefault}
            onCheckedChange={setIsDefault}
          />
          <Label htmlFor="isDefault">Endereço padrão</Label>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!nome || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : address ? (
              'Atualizar Endereço'
            ) : (
              'Adicionar Endereço'
            )}
          </Button>
        </div>
      </form>
    </Card>
  )
}
