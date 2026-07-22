'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ReferenciaImagesEditor } from '@/components/pedidos/ReferenciaImagesEditor';
import type { MesversarioAcordoInput } from '@/types/mesversario';
import type { PedidoImagemReferenciaInput } from '@/types/pedido';

interface AcordoEditorProps {
  value: MesversarioAcordoInput;
  onChange: (next: MesversarioAcordoInput) => void;
  disabled?: boolean;
}

/**
 * Controlled editor for a month's agreement: tema / sabor / notas plus
 * reference images (reusing the orders' ReferenciaImagesEditor).
 */
export function AcordoEditor({ value, onChange, disabled = false }: AcordoEditorProps) {
  const setField = (field: keyof MesversarioAcordoInput, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const setImages = (imagensReferencia: PedidoImagemReferenciaInput[]) => {
    onChange({ ...value, imagensReferencia });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="acordo-tema">Tema</Label>
        <Input
          id="acordo-tema"
          value={value.tema ?? ''}
          onChange={(e) => setField('tema', e.target.value)}
          placeholder="Ex.: Ursinhos, Safari, Chá de bebê..."
          maxLength={200}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="acordo-sabor">Sabor</Label>
        <Input
          id="acordo-sabor"
          value={value.sabor ?? ''}
          onChange={(e) => setField('sabor', e.target.value)}
          placeholder="Ex.: Chocolate, Ninho com morango..."
          maxLength={200}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="acordo-notas">Notas</Label>
        <Textarea
          id="acordo-notas"
          value={value.notas ?? ''}
          onChange={(e) => setField('notas', e.target.value)}
          placeholder="Combinações, restrições, detalhes do acordo com a família..."
          maxLength={2000}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label>Imagens de referência</Label>
        <ReferenciaImagesEditor
          value={value.imagensReferencia ?? []}
          onChange={setImages}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
