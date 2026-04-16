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
        case 2:
          return true // Delivery type is always chosen (default RETIRADA), address is optional
        case 3:
          return true // All fields optional
        case 4:
          return true // Review is always valid
        default:
          return false
      }
    },
    [selectedClient, items.length]
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
      const entrega: PedidoEntrega = {
        tipo: entregaTipo,
        custoPorKm: 0,
        taxaExtra: 0,
        freteTotal: 0,
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
    <div className="max-w-4xl space-y-6">
      {/* Step indicator */}
      <StepIndicator
        steps={STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Step content */}
      <div className="min-h-[400px]">
        <div
          className={`transition-all duration-200 ${getAnimationClass()}`}
        >
          {currentStep === 0 && (
            <div className="p-6">
              <ClienteStep
                selectedClient={selectedClient}
                onSelect={(c) => setSelectedClient(c)}
                onClear={() => setSelectedClient(null)}
              />
            </div>
          )}

          {currentStep === 1 && (
            <div className="p-6">
              <ItensStep items={items} onChange={setItems} />
            </div>
          )}

          {currentStep === 2 && (
            <div className="p-6">
              <EntregaStep
                entregaTipo={entregaTipo}
                onTipoChange={(tipo) => {
                  setEntregaTipo(tipo)
                  // Reset address selection when switching type
                  if (tipo === 'ENTREGA') {
                    setSelectedStoreAddress(null)
                  } else {
                    setSelectedClientAddress(null)
                  }
                }}
                selectedClientAddress={selectedClientAddress}
                clientAddresses={clientAddresses}
                loadingClientAddresses={loadingClientAddresses}
                onSelectClientAddress={setSelectedClientAddress}
                selectedStoreAddress={selectedStoreAddress}
                storeAddresses={storeAddresses}
                loadingStoreAddresses={loadingStoreAddresses}
                onSelectStoreAddress={setSelectedStoreAddress}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className="p-6">
              <DetalhesStep
                dataEntrega={dataEntrega}
                onDataEntregaChange={setDataEntrega}
                observacoes={observacoes}
                onObservacoesChange={setObservacoes}
                observacoesCliente={observacoesCliente}
                onObservacoesClienteChange={setObservacoesCliente}
              />
            </div>
          )}

          {currentStep === 4 && selectedClient && (
            <div className="p-6">
              <RevisaoStep
                client={selectedClient}
                items={items}
                entregaTipo={entregaTipo}
                selectedAddress={
                  entregaTipo === 'ENTREGA'
                    ? selectedClientAddress
                    : selectedStoreAddress
                }
                dataEntrega={dataEntrega}
                observacoes={observacoes}
                observacoesCliente={observacoesCliente}
                onEditStep={goToStep}
              />
            </div>
          )}
        </div>
      </div>

      {/* Inline submit error */}
      {submitError && (
        <div
          role="alert"
          className="rounded-md border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <p className="font-medium">Erro ao criar pedido</p>
          <p className="mt-1">{submitError}</p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <div>
          {currentStep > 0 ? (
            <Button variant="ghost" onClick={handlePrev} disabled={saving}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
          ) : (
            <Button variant="outline" onClick={() => router.push('/orders')} disabled={saving}>
              Cancelar
            </Button>
          )}
        </div>

        <div>
          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!isStepValid(currentStep)}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving || !selectedClient || items.length === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
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
  )
}
