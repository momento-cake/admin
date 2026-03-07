'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Plus, Trash2, Package, AlertTriangle } from 'lucide-react'
import { PedidoPacote, PedidoItem } from '@/types/pedido'
import { formatPrice } from '@/lib/products'

interface PacoteManagerProps {
  pacotes: PedidoPacote[]
  activeItems: PedidoItem[]
  onChange: (pacotes: PedidoPacote[]) => void
}

export function PacoteManager({
  pacotes,
  activeItems,
  onChange,
}: PacoteManagerProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    custo: '',
    itemIds: [] as string[],
  })

  const resetForm = () => {
    setFormData({ nome: '', custo: '', itemIds: [] })
    setIsAdding(false)
    setEditingId(null)
  }

  const handleEdit = (pacote: PedidoPacote) => {
    setFormData({
      nome: pacote.nome,
      custo: String(pacote.custo),
      itemIds: [...pacote.itemIds],
    })
    setEditingId(pacote.id)
    setIsAdding(true)
  }

  const handleSubmit = () => {
    const custo = parseFloat(formData.custo) || 0

    if (editingId) {
      const updated = pacotes.map((p) =>
        p.id === editingId
          ? { ...p, nome: formData.nome, custo, itemIds: formData.itemIds }
          : p
      )
      onChange(updated)
    } else {
      const newPacote: PedidoPacote = {
        id: crypto.randomUUID(),
        nome: formData.nome,
        custo,
        itemIds: formData.itemIds,
      }
      onChange([...pacotes, newPacote])
    }

    resetForm()
  }

  const handleRemove = (id: string) => {
    onChange(pacotes.filter((p) => p.id !== id))
  }

  const toggleItem = (itemId: string) => {
    setFormData((prev) => ({
      ...prev,
      itemIds: prev.itemIds.includes(itemId)
        ? prev.itemIds.filter((id) => id !== itemId)
        : [...prev.itemIds, itemId],
    }))
  }

  const totalCusto = pacotes.reduce((sum, p) => sum + p.custo, 0)

  const getItemName = (itemId: string) => {
    const item = activeItems.find((i) => i.id === itemId)
    return item?.nome || 'Item removido'
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Embalagens
          </CardTitle>
          {!isAdding && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Internal-only banner */}
        <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Custo Interno de Embalagem — não visível ao cliente</span>
        </div>

        {/* Existing packages */}
        {pacotes.length > 0 && (
          <div className="space-y-2">
            {pacotes.map((pacote) => (
              <div
                key={pacote.id}
                className="flex items-start justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{pacote.nome}</span>
                    <Badge variant="outline" className="text-xs">
                      {formatPrice(pacote.custo)}
                    </Badge>
                  </div>
                  {pacote.itemIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {pacote.itemIds.map((itemId) => (
                        <span
                          key={itemId}
                          className="px-1.5 py-0.5 bg-background border border-border rounded text-xs text-muted-foreground"
                        >
                          {getItemName(itemId)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(pacote)}
                    className="h-7 w-7 p-0 text-primary"
                  >
                    <Package className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover embalagem</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover esta embalagem?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemove(pacote.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="flex justify-between pt-2 border-t border-border text-sm font-medium">
              <span>Total Embalagens</span>
              <span>{formatPrice(totalCusto)}</span>
            </div>
          </div>
        )}

        {pacotes.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground italic">
            Nenhuma embalagem adicionada
          </p>
        )}

        {/* Add/edit form */}
        {isAdding && (
          <div className="space-y-3 p-3 bg-muted rounded-lg">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Nome da Embalagem
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: Caixa para bolo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Custo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.custo}
                onChange={(e) => setFormData((prev) => ({ ...prev, custo: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0.00"
              />
            </div>

            {/* Item multi-select */}
            {activeItems.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Itens desta embalagem
                </label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {activeItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-background cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.itemIds.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                        className="rounded border-border"
                      />
                      <span className="text-sm">{item.nome}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        x{item.quantidade}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={!formData.nome}
              >
                {editingId ? 'Atualizar' : 'Adicionar'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
