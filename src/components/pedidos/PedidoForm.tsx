'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Save,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Package,
  Truck,
  Calendar,
  ClipboardCheck,
} from 'lucide-react'
import { PedidoItem, PedidoEntrega } from '@/types/pedido'
import { Address } from '@/types/client'
import { formatErrorMessage } from '@/lib/error-handler'
import { StepIndicator } from './creation/StepIndicator'
import { ClienteStep } from './creation/ClienteStep'
import { ItensStep } from './creation/ItensStep'
import { EntregaStep } from './creation/EntregaStep'
import { DetalhesStep } from './creation/DetalhesStep'
import { RevisaoStep } from './creation/RevisaoStep'

interface PedidoFormProps {
  mode?: 'create' | 'edit'
}

const STEPS = [
  { label: 'Cliente', icon: <UserCheck className="h-4 w-4" /> },
  { label: 'Itens', icon: <Package className="h-4 w-4" /> },
  { label: 'Entrega', icon: <Truck className="h-4 w-4" /> },
  { label: 'Detalhes', icon: <Calendar className="h-4 w-4" /> },
  { label: 'Revisão', icon: <ClipboardCheck className="h-4 w-4" /> },
]

export function PedidoForm({ mode = 'create' }: PedidoFormProps) {
  const router = useRouter()

  // Step navigation
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [isAnimating, setIsAnimating] = useState(false)
  const completedStepsRef = useRef(new Set<number>())
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  // Client
  const [selectedClient, setSelectedClient] = useState<{
    id: string
    nome: string
    telefone?: string
  } | null>(null)

  // Items
  const [items, setItems] = useState<PedidoItem[]>([])

  // Delivery
  const [entregaTipo, setEntregaTipo] = useState<'ENTREGA' | 'RETIRADA'>('RETIRADA')
  const [clientAddresses, setClientAddresses] = useState<Address[]>([])
  const [loadingClientAddresses, setLoadingClientAddresses] = useState(false)
  const [storeAddresses, setStoreAddresses] = useState<
    { id: string; nome: string; endereco?: string; cidade?: string; bairro?: string; numero?: string; estado?: string; cep?: string }[]
  >([])
  const [loadingStoreAddresses, setLoadingStoreAddresses] = useState(false)
  const [selectedClientAddress, setSelectedClientAddress] = useState<Address | null>(null)
  const [selectedStoreAddress, setSelectedStoreAddress] = useState<{
    id: string
    nome: string
  } | null>(null)
  const [newAddress, setNewAddress] = useState<Partial<Address> | null>(null)

  // Dates & notes
  const [dataEntrega, setDataEntrega] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [observacoesCliente, setObservacoesCliente] = useState('')

  // Submit state
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Fetch client addresses when client is selected
  useEffect(() => {
    if (!selectedClient?.id) {
      setClientAddresses([])
      setSelectedClientAddress(null)
      return
    }

    const loadClientAddresses = async () => {
      setLoadingClientAddresses(true)
      try {
        const response = await fetch(`/api/clients/${selectedClient.id}`)
        const data = await response.json()
        if (data.success && data.data?.addresses) {
          setClientAddresses(data.data.addresses)
        } else {
          setClientAddresses([])
        }
      } catch (err) {
        console.error('Erro ao carregar endereços do cliente:', err)
        setClientAddresses([])
      } finally {
        setLoadingClientAddresses(false)
      }
    }
    loadClientAddresses()
  }, [selectedClient?.id])

  // Fetch store addresses when step 2 (Entrega) is first reached
  const storeAddressesFetched = useRef(false)
  useEffect(() => {
    if (currentStep >= 2 && !storeAddressesFetched.current) {
      storeAddressesFetched.current = true
      const loadStoreAddresses = async () => {
        setLoadingStoreAddresses(true)
        try {
          const response = await fetch('/api/store-addresses')
          const data = await response.json()
          if (data.success) {
            setStoreAddresses(data.data || [])
          }
        } catch (err) {
          console.error('Erro ao carregar endereços da loja:', err)
        } finally {
          setLoadingStoreAddresses(false)
        }
      }
      loadStoreAddresses()
    }
  }, [currentStep])

  // Step validation
  const isStepValid = useCallback(
    (step: number): boolean => {
      switch (step) {
        case 0:
          return selectedClient !== null
        case 1:
          return items.length > 0
        case 2: {
          if (entregaTipo === 'ENTREGA') {
            const hasNewAddr = !!(newAddress?.endereco?.trim())
            return !!(hasNewAddr || selectedClientAddress)
          }
          if (entregaTipo === 'RETIRADA') {
            return !!selectedStoreAddress
          }
          return false
        }
        case 3:
          return true // All fields optional
        case 4:
          return true // Review is always valid
        default:
          return false
      }
    },
    [selectedClient, items.length, entregaTipo, newAddress, selectedClientAddress, selectedStoreAddress]
  )

  // Update completed steps
  useEffect(() => {
    const newCompleted = new Set<number>()
    for (let i = 0; i < currentStep; i++) {
      if (isStepValid(i)) {
        newCompleted.add(i)
      }
    }
    completedStepsRef.current = newCompleted
    setCompletedSteps(newCompleted)
  }, [currentStep, isStepValid])

  const goToStep = (step: number) => {
    if (step === currentStep) return
    setDirection(step > currentStep ? 'forward' : 'backward')
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentStep(step)
      setIsAnimating(false)
    }, 150)
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && isStepValid(currentStep)) {
      goToStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1)
    }
  }

  const handleStepClick = (step: number) => {
    // Allow clicking completed steps or the current step
    if (completedSteps.has(step) || step <= currentStep) {
      goToStep(step)
    }
  }

  const handleSave = async () => {
    if (!selectedClient || items.length === 0) return

    setSubmitError(null)
    setSaving(true)

    try {
      // Determine delivery address
      const hasNewAddr = !!(newAddress?.endereco?.trim())

      const entrega: PedidoEntrega = {
        tipo: entregaTipo,
        custoPorKm: 0,
        taxaExtra: 0,
        freteTotal: 0,
        ...(entregaTipo === 'ENTREGA' && hasNewAddr && !selectedClientAddress
          ? {
              enderecoEntrega: {
                id: newAddress?.id || crypto.randomUUID(),
                label: newAddress?.label,
                cep: newAddress?.cep,
                estado: newAddress?.estado,
                cidade: newAddress?.cidade,
                bairro: newAddress?.bairro,
                endereco: newAddress?.endereco,
                numero: newAddress?.numero,
                complemento: newAddress?.complemento,
              } as Address,
            }
          : {}),
        ...(entregaTipo === 'ENTREGA' && selectedClientAddress
          ? {
              enderecoEntrega: selectedClientAddress,
              enderecoEntregaClienteId: selectedClient.id,
            }
          : {}),
        ...(entregaTipo === 'RETIRADA' && selectedStoreAddress
          ? {
              enderecoRetiradaId: selectedStoreAddress.id,
              enderecoRetiradaNome: selectedStoreAddress.nome,
            }
          : {}),
      }

      const pedidoData = {
        clienteId: selectedClient.id,
        clienteNome: selectedClient.nome,
        clienteTelefone: selectedClient.telefone,
        entrega,
        orcamentos: [
          {
            itens: items,
            desconto: 0,
            descontoTipo: 'valor',
            acrescimo: 0,
          },
        ],
        dataEntrega: dataEntrega ? new Date(dataEntrega).toISOString() : undefined,
        observacoes: observacoes || undefined,
        observacoesCliente: observacoesCliente || undefined,
      }

      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedidoData),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      toast.success('Pedido criado com sucesso!', {
        description: `Pedido ${result.data.numeroPedido} criado`,
      })

      router.push('/orders')
    } catch (error) {
      const message = formatErrorMessage(error)
      setSubmitError(message)
      toast.error('Erro ao criar pedido', {
        description: message,
      })
    } finally {
      setSaving(false)
    }
  }

  // Determine the selected address for the review step
  const getSelectedAddressForReview = (): Address | { id: string; nome: string } | null => {
    if (entregaTipo === 'ENTREGA') {
      if (selectedClientAddress) return selectedClientAddress
      if (newAddress?.endereco?.trim()) {
        return {
          id: newAddress.id || 'new',
          label: newAddress.label,
          cep: newAddress.cep,
          estado: newAddress.estado,
          cidade: newAddress.cidade,
          bairro: newAddress.bairro,
          endereco: newAddress.endereco,
          numero: newAddress.numero,
          complemento: newAddress.complemento,
        } as Address
      }
      return null
    }
    return selectedStoreAddress
  }

  // Animation classes
  const getAnimationClass = () => {
    if (isAnimating) {
      return direction === 'forward'
        ? 'translate-x-8 opacity-0'
        : '-translate-x-8 opacity-0'
    }
    return 'translate-x-0 opacity-100'
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Stepper card */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        {/* Step indicator header */}
        <div className="border-b border-border/40 bg-muted/30 px-4 py-5 sm:px-8 sm:py-6">
          <StepIndicator
            steps={STEPS}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
          />
        </div>

        {/* Step content area */}
        <div className="min-h-[360px] px-5 py-6 sm:px-8 sm:py-8">
          <div className={`transition-all duration-200 ${getAnimationClass()}`}>
            {currentStep === 0 && (
              <ClienteStep
                selectedClient={selectedClient}
                onSelect={(c) => setSelectedClient(c)}
                onClear={() => setSelectedClient(null)}
              />
            )}

            {currentStep === 1 && (
              <ItensStep items={items} onChange={setItems} />
            )}

            {currentStep === 2 && (
              <EntregaStep
                entregaTipo={entregaTipo}
                onTipoChange={(tipo) => {
                  setEntregaTipo(tipo)
                  if (tipo === 'ENTREGA') {
                    setSelectedStoreAddress(null)
                  } else {
                    setSelectedClientAddress(null)
                    setNewAddress(null)
                  }
                }}
                selectedClientAddress={selectedClientAddress}
                clientAddresses={clientAddresses}
                loadingClientAddresses={loadingClientAddresses}
                onSelectClientAddress={setSelectedClientAddress}
                newAddress={newAddress}
                onNewAddressChange={setNewAddress}
                selectedStoreAddress={selectedStoreAddress}
                storeAddresses={storeAddresses}
                loadingStoreAddresses={loadingStoreAddresses}
                onSelectStoreAddress={setSelectedStoreAddress}
              />
            )}

            {currentStep === 3 && (
              <DetalhesStep
                dataEntrega={dataEntrega}
                onDataEntregaChange={setDataEntrega}
                observacoes={observacoes}
                onObservacoesChange={setObservacoes}
                observacoesCliente={observacoesCliente}
                onObservacoesClienteChange={setObservacoesCliente}
              />
            )}

            {currentStep === 4 && selectedClient && (
              <RevisaoStep
                client={selectedClient}
                items={items}
                entregaTipo={entregaTipo}
                selectedAddress={getSelectedAddressForReview()}
                dataEntrega={dataEntrega}
                observacoes={observacoes}
                observacoesCliente={observacoesCliente}
                onEditStep={goToStep}
              />
            )}
          </div>
        </div>

        {/* Inline submit error */}
        {submitError && (
          <div className="px-5 sm:px-8 pb-4">
            <div
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <p className="font-medium">Erro ao criar pedido</p>
              <p className="mt-1">{submitError}</p>
            </div>
          </div>
        )}

        {/* Navigation footer */}
        <div className="border-t border-border/40 bg-muted/20 px-5 py-4 sm:px-8">
          <div className="flex items-center justify-end gap-3">
            {currentStep > 0 ? (
              <Button variant="ghost" size="sm" onClick={handlePrev} disabled={saving}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/orders')}
                disabled={saving}
              >
                Cancelar
              </Button>
            )}

            {currentStep < STEPS.length - 1 ? (
              <Button onClick={handleNext} disabled={!isStepValid(currentStep)}>
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving || !selectedClient || items.length === 0}
                className="min-w-[140px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Criar Pedido
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
