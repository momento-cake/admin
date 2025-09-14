'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export interface AutocompleteOption {
  value: string;
  label: string;
  searchTerms?: string[]; // Additional terms to match against
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onSearch?: (search: string) => void;
}

export function Autocomplete({
  options,
  value,
  onValueChange,
  placeholder = 'Selecione uma opção...',
  emptyText = 'Nenhuma opção encontrada.',
  className,
  disabled = false,
  loading = false,
  onSearch
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  // Find the selected option
  const selectedOption = options.find((option) => option.value === value);

  // Display value in the input
  const displayValue = selectedOption?.label || '';

  // Handle search input changes
  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const search = e.target.value;
    setSearchValue(search);
    setOpen(true);
    setHighlightedIndex(-1);
    
    if (onSearch) {
      onSearch(search);
    }
  }, [onSearch]);

  // Handle value selection
  const handleSelect = (selectedValue: string) => {
    const option = options.find(opt => opt.value === selectedValue);
    onValueChange(selectedValue);
    setSearchValue(option?.label || '');
    setOpen(false);
    setHighlightedIndex(-1);
  };

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchValue && !open) return [];
    
    const searchLower = searchValue.toLowerCase();
    return options.filter((option) => {
      // Search in label
      if (option.label.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in additional search terms
      if (option.searchTerms) {
        return option.searchTerms.some(term => 
          term.toLowerCase().includes(searchLower)
        );
      }
      
      return false;
    });
  }, [options, searchValue, open]);

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setOpen(true);
        return;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        setOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }, [open, filteredOptions, highlightedIndex]);

  // Handle input focus
  const handleFocus = () => {
    if (!disabled) {
      setSearchValue(displayValue);
      setOpen(true);
    }
  };

  // Handle input blur
  const handleBlur = (e: React.FocusEvent) => {
    // Delay closing to allow option selection
    setTimeout(() => {
      if (!listRef.current?.contains(document.activeElement)) {
        setOpen(false);
        setSearchValue(displayValue);
        setHighlightedIndex(-1);
      }
    }, 150);
  };

  // Update search value when selected value changes
  React.useEffect(() => {
    if (!open) {
      setSearchValue(displayValue);
    }
  }, [displayValue, open]);

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={searchValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {loading ? (
            <Search className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
          {filteredOptions.length === 0 ? (
            <div className="py-2 px-3 text-sm text-muted-foreground">
              {loading ? 'Carregando...' : emptyText}
            </div>
          ) : (
            <ul ref={listRef} className="py-1">
              {filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground',
                    highlightedIndex === index && 'bg-accent text-accent-foreground',
                    value === option.value && 'bg-accent/50'
                  )}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="flex-1">{option.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}