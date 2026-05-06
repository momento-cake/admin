'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Search, Loader2, Package, AlertCircle } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { fetchProducts, formatPrice } from '@/lib/products'
import { Product } from '@/types/product'
import { logError } from '@/lib/error-handler'

interface ProdutoSelectorProps {
  onSelect: (product: { id: string; nome: string; preco: number; sku: string }) => void
}

export function ProdutoSelector({ onSelect }: ProdutoSelectorProps) {
  const [searchInput, setSearchInput] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const debouncedSearch = useDebounce(searchInput, 300)

  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setResults([])
      setSearchError(null)
      return
    }

    const search = async () => {
      setLoading(true)
      setSearchError(null)
      try {
        const response = await fetchProducts({ searchQuery: debouncedSearch }, 10)
        setResults(response.products)
        setShowResults(true)
      } catch (error) {
        logError('ProdutoSelector.search', error)
        setResults([])
        setSearchError('Erro ao buscar produtos. Tente novamente.')
        setShowResults(true)
      } finally {
        setLoading(false)
      }
    }

    search()
  }, [debouncedSearch])

  const handleSelect = (product: Product) => {
    onSelect({
      id: product.id,
      nome: product.name,
      preco: product.price,
      sku: product.sku,
    })
    setSearchInput('')
    setShowResults(false)
    setResults([])
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar produto por nome ou SKU..."
          className="pl-10"
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showResults && searchError && (
        <Card className="absolute z-50 w-full mt-1 shadow-lg">
          <div className="flex items-start gap-2 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden />
            <span>{searchError}</span>
          </div>
        </Card>
      )}

      {showResults && !searchError && results.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto shadow-lg">
          {results.map((product) => (
            <button
              key={product.id}
              type="button"
              className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-b-0"
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(product)
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <code className="font-mono bg-muted px-1 rounded">{product.sku}</code>
                    {product.categoryName && <span className="ml-2">{product.categoryName}</span>}
                  </p>
                </div>
                <span className="text-sm font-medium text-nowrap ml-4">
                  {formatPrice(product.price)}
                </span>
              </div>
            </button>
          ))}
        </Card>
      )}

      {showResults && !searchError && debouncedSearch.length >= 2 && results.length === 0 && !loading && (
        <Card className="absolute z-50 w-full mt-1 shadow-lg">
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            Nenhum produto encontrado
          </div>
        </Card>
      )}
    </div>
  )
}
