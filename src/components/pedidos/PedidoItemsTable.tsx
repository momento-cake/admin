'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Plus, Trash2, Package, PenLine } from 'lucide-react'
import { PedidoItem } from '@/types/pedido'
import { ProdutoSelector } from './ProdutoSelector'
import { formatPrice } from '@/lib/products'

interface PedidoItemsTableProps {
  items: PedidoItem[]
  onChange: (items: PedidoItem[]) => void
  readOnly?: boolean
}

type AddMode = 'product' | 'custom' | null

export function PedidoItemsTable({ items, onChange, readOnly = false }: PedidoItemsTableProps) {
  const [addMode, setAddMode] = useState<AddMode>(null)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [customQty, setCustomQty] = useState('1')

  const handleAddProduct = (product: { id: string; nome: string; preco: number; sku: string }) => {
    const newItem: PedidoItem = {
      id: crypto.randomUUID(),
      produtoId: product.id,
      nome: product.nome,
      precoUnitario: product.preco,
      quantidade: 1,
      total: product.preco,
    }
    onChange([...items, newItem])
    setAddMode(null)
  }

  const handleAddCustom = () => {
    const price = parseFloat(customPrice.replace(',', '.')) || 0
    const qty = parseFloat(customQty.replace(',', '.')) || 1

    if (!customName.trim() || price <= 0) return

    const newItem: PedidoItem = {
      id: crypto.randomUUID(),
      produtoId: null,
      nome: customName.trim(),
      precoUnitario: price,
      quantidade: qty,
      total: price * qty,
    }
    onChange([...items, newItem])
    setCustomName('')
    setCustomPrice('')
    setCustomQty('1')
    setAddMode(null)
  }

  const handleRemoveItem = (itemId: string) => {
    onChange(items.filter((i) => i.id !== itemId))
  }

  const handleUpdateItem = (itemId: string, field: 'quantidade' | 'precoUnitario', value: string) => {
    const numValue = parseFloat(value.replace(',', '.')) || 0

    onChange(
      items.map((item) => {
        if (item.id !== itemId) return item
        const updated = { ...item, [field]: numValue }
        updated.total = updated.precoUnitario * updated.quantidade
        return updated
      })
    )
  }

  const subtotal = items.reduce((sum, item) => sum + item.total, 0)

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="w-[100px]">Qtd</TableHead>
                <TableHead className="w-[140px] text-right">Preco Unit.</TableHead>
                <TableHead className="w-[120px] text-right">Total</TableHead>
                {!readOnly && <TableHead className="w-[60px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium text-sm">{item.nome}</span>
                      {item.produtoId ? (
                        <span className="ml-2 text-xs text-muted-foreground">(produto)</span>
                      ) : (
                        <span className="ml-2 text-xs text-muted-foreground">(personalizado)</span>
                      )}
                    </div>
                    {item.descricao && (
                      <p className="text-xs text-muted-foreground">{item.descricao}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      <span>{item.quantidade}</span>
                    ) : (
                      <Input
                        type="number"
                        value={item.quantidade}
                        onChange={(e) => handleUpdateItem(item.id, 'quantidade', e.target.value)}
                        min="0.01"
                        step="1"
                        className="h-8 w-20"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {readOnly ? (
                      <span>{formatPrice(item.precoUnitario)}</span>
                    ) : (
                      <Input
                        type="number"
                        value={item.precoUnitario}
                        onChange={(e) => handleUpdateItem(item.id, 'precoUnitario', e.target.value)}
                        min="0"
                        step="0.01"
                        className="h-8 w-28 text-right"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(item.total)}
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover item</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover este item?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveItem(item.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}

              {/* Subtotal row */}
              <TableRow>
                <TableCell colSpan={readOnly ? 3 : 3} className="text-right font-medium">
                  Subtotal
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatPrice(subtotal)}
                </TableCell>
                {!readOnly && <TableCell />}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {items.length === 0 && !addMode && (
        <div className="border rounded-md p-6 text-center">
          <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum item adicionado</p>
        </div>
      )}

      {/* Add item controls */}
      {!readOnly && !addMode && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddMode('product')}>
            <Package className="h-4 w-4 mr-2" />
            Adicionar Produto
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAddMode('custom')}>
            <PenLine className="h-4 w-4 mr-2" />
            Item Personalizado
          </Button>
        </div>
      )}

      {/* Product search mode */}
      {addMode === 'product' && (
        <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
          <p className="text-sm font-medium">Selecionar Produto</p>
          <ProdutoSelector onSelect={handleAddProduct} />
          <Button variant="ghost" size="sm" onClick={() => setAddMode(null)}>
            Cancelar
          </Button>
        </div>
      )}

      {/* Custom item mode */}
      {addMode === 'custom' && (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
          <p className="text-sm font-medium">Item Personalizado</p>
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Nome do item"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Preco unitario (R$)</label>
              <Input
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Quantidade</label>
              <Input
                value={customQty}
                onChange={(e) => setCustomQty(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddCustom} disabled={!customName.trim() || !customPrice}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAddMode(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
