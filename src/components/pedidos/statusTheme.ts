import { PedidoStatus } from '@/types/pedido'

export interface StatusTheme {
  label: string
  dot: string
  softBg: string
  softRing: string
  softText: string
  columnAccent: string
  columnBorder: string
  columnHeaderBg: string
  columnHeaderText: string
  dragOverBg: string
  dragOverRing: string
}

export const STATUS_THEME: Record<PedidoStatus, StatusTheme> = {
  RASCUNHO: {
    label: 'Rascunho',
    dot: 'bg-stone-400',
    softBg: 'bg-stone-100',
    softRing: 'ring-stone-200',
    softText: 'text-stone-700',
    columnAccent: 'from-stone-300 to-stone-200',
    columnBorder: 'border-stone-200',
    columnHeaderBg: 'bg-stone-50',
    columnHeaderText: 'text-stone-700',
    dragOverBg: 'bg-stone-100/80',
    dragOverRing: 'ring-stone-400',
  },
  AGUARDANDO_APROVACAO: {
    label: 'Aguardando',
    dot: 'bg-amber-500',
    softBg: 'bg-amber-50',
    softRing: 'ring-amber-200',
    softText: 'text-amber-800',
    columnAccent: 'from-amber-400 to-amber-300',
    columnBorder: 'border-amber-200',
    columnHeaderBg: 'bg-amber-50',
    columnHeaderText: 'text-amber-900',
    dragOverBg: 'bg-amber-100/80',
    dragOverRing: 'ring-amber-500',
  },
  CONFIRMADO: {
    label: 'Confirmado',
    dot: 'bg-sky-500',
    softBg: 'bg-sky-50',
    softRing: 'ring-sky-200',
    softText: 'text-sky-800',
    columnAccent: 'from-sky-400 to-sky-300',
    columnBorder: 'border-sky-200',
    columnHeaderBg: 'bg-sky-50',
    columnHeaderText: 'text-sky-900',
    dragOverBg: 'bg-sky-100/80',
    dragOverRing: 'ring-sky-500',
  },
  EM_PRODUCAO: {
    label: 'Em Produção',
    dot: 'bg-[#8e5a3a]',
    softBg: 'bg-[#f5ebe0]',
    softRing: 'ring-[#d9b896]',
    softText: 'text-[#6b4226]',
    columnAccent: 'from-[#a77047] to-[#c28a5e]',
    columnBorder: 'border-[#d9b896]',
    columnHeaderBg: 'bg-[#f5ebe0]',
    columnHeaderText: 'text-[#6b4226]',
    dragOverBg: 'bg-[#f0dcc3]/80',
    dragOverRing: 'ring-[#8e5a3a]',
  },
  PRONTO: {
    label: 'Pronto',
    dot: 'bg-emerald-500',
    softBg: 'bg-emerald-50',
    softRing: 'ring-emerald-200',
    softText: 'text-emerald-800',
    columnAccent: 'from-emerald-400 to-emerald-300',
    columnBorder: 'border-emerald-200',
    columnHeaderBg: 'bg-emerald-50',
    columnHeaderText: 'text-emerald-900',
    dragOverBg: 'bg-emerald-100/80',
    dragOverRing: 'ring-emerald-500',
  },
  ENTREGUE: {
    label: 'Entregue',
    dot: 'bg-teal-600',
    softBg: 'bg-teal-50',
    softRing: 'ring-teal-200',
    softText: 'text-teal-800',
    columnAccent: 'from-teal-500 to-teal-400',
    columnBorder: 'border-teal-200',
    columnHeaderBg: 'bg-teal-50',
    columnHeaderText: 'text-teal-900',
    dragOverBg: 'bg-teal-100/80',
    dragOverRing: 'ring-teal-500',
  },
  CANCELADO: {
    label: 'Cancelado',
    dot: 'bg-rose-500',
    softBg: 'bg-rose-50',
    softRing: 'ring-rose-200',
    softText: 'text-rose-800',
    columnAccent: 'from-rose-400 to-rose-300',
    columnBorder: 'border-rose-200',
    columnHeaderBg: 'bg-rose-50',
    columnHeaderText: 'text-rose-900',
    dragOverBg: 'bg-rose-100/80',
    dragOverRing: 'ring-rose-500',
  },
}

export const KANBAN_COLUMN_ORDER: PedidoStatus[] = [
  'RASCUNHO',
  'AGUARDANDO_APROVACAO',
  'CONFIRMADO',
  'EM_PRODUCAO',
  'PRONTO',
  'ENTREGUE',
  'CANCELADO',
]
