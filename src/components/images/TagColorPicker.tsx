'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TAG_COLORS, DEFAULT_TAG_COLOR } from '@/types/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TagColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  className?: string;
}

export function TagColorPicker({
  value,
  onChange,
  disabled = false,
  className
}: TagColorPickerProps) {
  const [customColor, setCustomColor] = React.useState(
    TAG_COLORS.includes(value as typeof TAG_COLORS[number]) ? '' : value
  );

  const handleColorSelect = (color: string) => {
    if (disabled) return;
    setCustomColor('');
    onChange(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      onChange(color);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Preset colors */}
      <div className="grid grid-cols-10 gap-2">
        {TAG_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            disabled={disabled}
            onClick={() => handleColorSelect(color)}
            className={cn(
              'h-6 w-6 rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
              disabled && 'opacity-50 cursor-not-allowed hover:scale-100',
              value === color && 'ring-2 ring-offset-2 ring-primary'
            )}
            style={{ backgroundColor: color }}
            title={color}
          >
            {value === color && (
              <Check className={cn(
                'h-4 w-4 mx-auto',
                // Determine check color based on background luminance
                parseInt(color.slice(1, 3), 16) * 0.299 +
                parseInt(color.slice(3, 5), 16) * 0.587 +
                parseInt(color.slice(5, 7), 16) * 0.114 > 128
                  ? 'text-black'
                  : 'text-white'
              )} />
            )}
          </button>
        ))}
      </div>

      {/* Custom color input */}
      <div className="flex items-center gap-2">
        <Label htmlFor="custom-color" className="text-sm text-muted-foreground whitespace-nowrap">
          Cor personalizada:
        </Label>
        <div className="flex items-center gap-2 flex-1">
          <Input
            id="custom-color"
            type="text"
            value={customColor}
            onChange={handleCustomColorChange}
            placeholder="#FF6B6B"
            disabled={disabled}
            className="h-8 w-24 font-mono text-sm"
          />
          <input
            type="color"
            value={value || DEFAULT_TAG_COLOR}
            onChange={(e) => {
              setCustomColor(e.target.value);
              onChange(e.target.value);
            }}
            disabled={disabled}
            className={cn(
              'h-8 w-8 rounded border cursor-pointer',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
          <div
            className="h-8 w-8 rounded border flex items-center justify-center"
            style={{ backgroundColor: value || DEFAULT_TAG_COLOR }}
          >
            {!TAG_COLORS.includes(value as typeof TAG_COLORS[number]) && value && (
              <Check className={cn(
                'h-4 w-4',
                parseInt(value.slice(1, 3), 16) * 0.299 +
                parseInt(value.slice(3, 5), 16) * 0.587 +
                parseInt(value.slice(5, 7), 16) * 0.114 > 128
                  ? 'text-black'
                  : 'text-white'
              )} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
