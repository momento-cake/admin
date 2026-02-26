'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, Plus } from 'lucide-react'

interface TagsSectionProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  suggestedTags?: string[]
}

const DEFAULT_TAGS = [
  'VIP',
  'Regular',
  'Novo Cliente',
  'Inativo',
  'Fornecedor',
  'Distribuidor',
  'Atacado',
  'Varejo',
  'Online',
  'Corporativo',
  'Resgate',
  'Devedora',
  'Em Atraso'
]

export function TagsSection({
  tags,
  onTagsChange,
  suggestedTags = []
}: TagsSectionProps) {
  const [inputValue, setInputValue] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const availableTags = [...new Set([...suggestedTags, ...DEFAULT_TAGS])].filter(
    tag => !tags.includes(tag)
  )

  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag) && tag.trim()) {
      onTagsChange([...tags, tag.trim()])
      setInputValue('')
    }
  }

  const handleCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      handleAddTag(inputValue)
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove))
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Tags de Categorização</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Adicione tags para organizar e categorizar clientes
        </p>
      </div>

      {/* Display Selected Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-primary/80 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input for Custom Tags */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleCustomTag}
            placeholder="Digite uma tag customizada e pressione Enter"
            className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddTag(inputValue)}
            disabled={!inputValue.trim()}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Suggested Tags */}
      {availableTags.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
          >
            {isExpanded ? '▼' : '▶'} Tags sugeridas ({availableTags.length})
          </button>

          {isExpanded && (
            <Card className="p-3">
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    className="px-3 py-1 bg-muted text-foreground rounded-full hover:bg-muted/80 transition text-sm font-medium"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Info */}
      {tags.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Nenhuma tag adicionada. Use tags para organizar clientes por categoria.
        </p>
      )}
    </div>
  )
}
