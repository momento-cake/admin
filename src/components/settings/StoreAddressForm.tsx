'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { Loader2, MapPin, PencilLine, Pencil } from 'lucide-react'
import { formatCEP } from '@/lib/masks'
import { useCepLookup, type CepResult } from '@/hooks/useCepLookup'
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

type FormState = 'idle' | 'loading' | 'resolved' | 'resolved-editable' | 'not-found'

export function StoreAddressForm({
  address,
  onSave,
  onCancel,
  isSaving = false,
}: StoreAddressFormProps) {
  const initialCep = address?.cep || ''
  const initialHasAddress =
    !!initialCep ||
    !!address?.endereco ||
    !!address?.bairro ||
    !!address?.cidade ||
    !!address?.estado

  const [nome, setNome] = useState(address?.nome || '')
  const [cep, setCep] = useState(initialCep)
  const [estado, setEstado] = useState(address?.estado || '')
  const [cidade, setCidade] = useState(address?.cidade || '')
  const [bairro, setBairro] = useState(address?.bairro || '')
  const [endereco, setEndereco] = useState(address?.endereco || '')
  const [numero, setNumero] = useState(address?.numero || '')
  const [complemento, setComplemento] = useState(address?.complemento || '')
  const [isDefault, setIsDefault] = useState(address?.isDefault ?? false)
  const [formState, setFormState] = useState<FormState>(
    initialHasAddress ? 'resolved' : 'idle'
  )

  const { lookup, loading, error, reset } = useCepLookup()
  // Seed with the initial CEP so edit-mode doesn't re-fetch on mount and
  // overwrite the persisted address with ViaCEP's current response.
  const lastLookedUpCep = useRef<string>(
    initialHasAddress ? initialCep.replace(/\D/g, '') : ''
  )

  const cepDigits = cep.replace(/\D/g, '')

  // Auto-trigger CEP lookup when 8 digits are present and it's a new CEP.
  useEffect(() => {
    if (cepDigits.length !== 8) return
    if (lastLookedUpCep.current === cepDigits) return
    lastLookedUpCep.current = cepDigits

    let cancelled = false
    setFormState('loading')
    lookup(cepDigits).then((result: CepResult | null) => {
      if (cancelled) return
      if (result) {
        setEndereco(result.logradouro || '')
        setBairro(result.bairro || '')
        setCidade(result.localidade || '')
        setEstado(result.uf || '')
        setFormState('resolved')
      } else {
        setFormState('not-found')
      }
    })
    return () => {
      cancelled = true
    }
  }, [cepDigits, lookup])

  const handleCepChange = (value: string) => {
    const formatted = formatCEP(value)
    setCep(formatted)
    const digits = formatted.replace(/\D/g, '')
    if (digits.length !== 8) {
      lastLookedUpCep.current = ''
      if (formState !== 'idle') {
        setEndereco('')
        setBairro('')
        setCidade('')
        setEstado('')
        setFormState('idle')
      }
      reset()
    }
  }

  const handleUnlock = () => setFormState('resolved-editable')

  const handleManualEntry = () => {
    setEndereco('')
    setBairro('')
    setCidade('')
    setEstado('')
    setFormState('resolved-editable')
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

  const showAddressBlock =
    formState === 'loading' ||
    formState === 'resolved' ||
    formState === 'resolved-editable'
  const readOnly = formState === 'resolved'
  const readOnlyClass = readOnly ? 'bg-muted/60 cursor-default' : ''

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome do Endereço *</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Loja Principal, Filial Centro"
            required
          />
        </div>

        {/* CEP */}
        <div className="space-y-1.5">
          <Label htmlFor="cep">CEP</Label>
          <div className="relative">
            <Input
              id="cep"
              value={cep}
              onChange={(e) => handleCepChange(e.target.value)}
              placeholder="00000-000"
              maxLength={9}
              inputMode="numeric"
              autoComplete="postal-code"
              className="pr-10"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {formState === 'idle' && (
            <p className="text-xs text-muted-foreground">
              Digite o CEP para preencher o endereço automaticamente.
            </p>
          )}
          {formState === 'not-found' && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <span>{error || 'CEP não encontrado'}</span>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={handleManualEntry}
              >
                Digitar manualmente
              </Button>
            </div>
          )}
        </div>

        {/* Address block (progressive) */}
        {showAddressBlock && (
          <div className="rounded-md border bg-muted/30 p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <MapPin className="h-3.5 w-3.5" />
                Endereço
                {formState === 'loading' && (
                  <span className="normal-case tracking-normal text-muted-foreground/70">
                    — buscando…
                  </span>
                )}
              </div>
              {formState === 'resolved' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleUnlock}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar endereço
                </Button>
              )}
            </div>

            {formState === 'loading' ? (
              <div className="space-y-3">
                <div className="h-9 rounded-md bg-muted animate-pulse" />
                <div className="h-9 rounded-md bg-muted animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-9 rounded-md bg-muted animate-pulse" />
                  <div className="h-9 rounded-md bg-muted animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    readOnly={readOnly}
                    className={readOnlyClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    readOnly={readOnly}
                    className={readOnlyClass}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      readOnly={readOnly}
                      className={readOnlyClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      readOnly={readOnly}
                      maxLength={2}
                      className={readOnlyClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="123"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      placeholder="Apto, sala, etc"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Default toggle */}
        <div className="flex items-center gap-3 pt-1">
          <Switch
            id="isDefault"
            checked={isDefault}
            onCheckedChange={setIsDefault}
          />
          <Label htmlFor="isDefault" className="cursor-pointer">
            Endereço padrão
          </Label>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={!nome || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : address ? (
              <>
                <PencilLine className="h-4 w-4 mr-2" />
                Atualizar Endereço
              </>
            ) : (
              'Adicionar Endereço'
            )}
          </Button>
        </div>
      </form>
    </Card>
  )
}
