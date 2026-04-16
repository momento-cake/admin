'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Trash2, Package, PenLine, Check } from 'lucide-react'
import { PedidoItem } from '@/types/pedido'
import { ProdutoSelector } from './ProdutoSelector'
import { formatPrice } from '@/lib/products'

interface PedidoItemsTableProps {
  items: PedidoItem[]
  onChange: (items: PedidoItem[]) => void
  readOnly?: boolean
}

export function PedidoItemsTable({ items, onChange, readOnly = false }: PedidoItemsTableProps) {
  // Product dialog state
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string
    nome: string
    preco: number
    sku: string
  } | null>(null)
  const [productQty, setProductQty] = useState('1')
  const [productAdded, setProductAdded] = useState(false)

  // Custom item dialog state
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [customQty, setCustomQty] = useState('1')
  const [customAdded, setCustomAdded] = useState(false)

  const handleProductSelected = (product: { id: string; nome: string; preco: number; sku: string }) => {
    setSelectedProduct(product)
    setProductQty('1')
    setProductAdded(false)
  }

  const handleAddProduct = () => {
    if (!selectedProduct) return

    const qty = parseFloat(productQty.replace(',', '.')) || 1
    const newItem: PedidoItem = {
      id: crypto.randomUUID(),
      produtoId: selectedProduct.id,
      nome: selectedProduct.nome,
      precoUnitario: selectedProduct.preco,
      quantidade: qty,
      total: selectedProduct.preco * qty,
    }
    onChange([...items, newItem])
    setProductAdded(true)

    // Reset for next product after a brief success flash
    setTimeout(() => {
      setSelectedProduct(null)
      setProductQty('1')
      setProductAdded(false)
    }, 800)
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
    setCustomAdded(true)

    // Reset form for next item after a brief success flash
    setTimeout(() => {
      setCustomName('')
      setCustomPrice('')
      setCustomQty('1')
      setCustomAdded(false)
    }, 800)
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

  const resetProductDialog = () => {
    setSelectedProduct(null)
    setProductQty('1')
    setProductAdded(false)
  }

  const resetCustomDialog = () => {
    setCustomName('')
    setCustomPrice('')
    setCustomQty('1')
    setCustomAdded(false)
  }

  const subtotal = items.reduce((sum, item) => sum + item.total, 0)

  const customTotal = (() => {
    const price = parseFloat(customPrice.replace(',', '.')) || 0
    const qty = parseFloat(customQty.replace(',', '.')) || 1
    return price * qty
  })()

  return (
    <div className="space-y-4">
      {/* Add item buttons at the top */}
      {!readOnly && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { resetProductDialog(); setProductDialogOpen(true) }}>
            <Package className="h-4 w-4 mr-2" />
            Adicionar Produto
          </Button>
          <Button variant="outline" size="sm" onClick={() => { resetCustomDialog(); setCustomDialogOpen(true) }}>
            <PenLine className="h-4 w-4 mr-2" />
            Item Personalizado
          </Button>
        </div>
      )}

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

      {items.length === 0 && (
        <div className="border rounded-md p-6 text-center">
          <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum item adicionado</p>
        </div>
      )}

      {/* Product search dialog */}
      <Dialog open={productDialogOpen} onOpenChange={(open) => { if (!open) resetProductDialog(); setProductDialogOpen(open) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Produto</DialogTitle>
            <DialogDescription>
              Busque e selecione um produto para adicionar ao pedido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!selectedProduct ? (
              <ProdutoSelector onSelect={handleProductSelected} />
            ) : (
              <div className="space-y-4">
                {productAdded ? (
                  <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
                    <Check className="h-4 w-4" />
                    Produto adicionado!
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="font-medium text-sm">{selectedProduct.nome}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <code className="font-mono bg-muted px-1 rounded">{selectedProduct.sku}</code>
                        <span className="ml-2">{formatPrice(selectedProduct.preco)}</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="product-qty">Quantidade</Label>
                      <Input
                        id="product-qty"
                        type="number"
                        value={productQty}
                        onChange={(e) => setProductQty(e.target.value)}
                        min="1"
                        step="1"
                        className="w-28"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  {!productAdded && (
                    <>
                      <Button onClick={handleAddProduct}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                      <Button variant="ghost" onClick={() => setSelectedProduct(null)}>
                        Voltar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setProductDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom item dialog */}
      <Dialog open={customDialogOpen} onOpenChange={(open) => { if (!open) resetCustomDialog(); setCustomDialogOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Item Personalizado</DialogTitle>
            <DialogDescription>
              Adicione um item personalizado ao pedido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {customAdded ? (
              <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
                <Check className="h-4 w-4" />
                Item adicionado!
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="custom-name">Nome do item *</Label>
                  <Input
                    id="custom-name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Nome do item"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="custom-price">Preco unitario (R$) *</Label>
                    <Input
                      id="custom-price"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-qty">Quantidade</Label>
                    <Input
                      id="custom-qty"
                      value={customQty}
                      onChange={(e) => setCustomQty(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>

                {customPrice && customName.trim() && (
                  <div className="text-right text-sm text-muted-foreground">
                    Total: <span className="font-medium text-foreground">{formatPrice(customTotal)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            {!customAdded && (
              <Button
                onClick={handleAddCustom}
                disabled={!customName.trim() || !customPrice}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            )}
            <Button variant="ghost" onClick={() => setCustomDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
