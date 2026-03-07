import { Timestamp } from 'firebase/firestore'

export interface StoreAddress {
  id: string
  nome: string
  cep?: string
  estado?: string
  cidade?: string
  bairro?: string
  endereco?: string
  numero?: string
  complemento?: string
  isDefault: boolean
  isActive: boolean
  createdAt: Timestamp
  createdBy: string
}

export interface StoreSettings {
  custoPorKm: number
  updatedAt: Timestamp
  updatedBy: string
}

export interface StoreHours {
  id: string
  diaSemana: number
  diaSemanaLabel: string
  abreAs: string
  fechaAs: string
  fechado: boolean
  createdAt: Timestamp
  updatedBy?: string
}

export const DIAS_SEMANA: { diaSemana: number; label: string }[] = [
  { diaSemana: 0, label: 'Domingo' },
  { diaSemana: 1, label: 'Segunda-feira' },
  { diaSemana: 2, label: 'Terça-feira' },
  { diaSemana: 3, label: 'Quarta-feira' },
  { diaSemana: 4, label: 'Quinta-feira' },
  { diaSemana: 5, label: 'Sexta-feira' },
  { diaSemana: 6, label: 'Sábado' },
]
