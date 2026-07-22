/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Expose the reference-images onChange so we can drive setImages().
vi.mock('@/components/pedidos/ReferenciaImagesEditor', () => ({
  ReferenciaImagesEditor: ({ onChange }: any) => (
    <button
      type="button"
      data-testid="add-ref-image"
      onClick={() =>
        onChange([{ url: 'https://x.test/a.jpg', storagePath: 'images/a.jpg' }])
      }
    >
      add image
    </button>
  ),
}));

import { AcordoEditor } from '@/components/mesversarios/AcordoEditor';
import type { MesversarioAcordoInput } from '@/types/mesversario';

function Harness({ initial }: { initial?: MesversarioAcordoInput }) {
  const [value, setValue] = (require('react') as typeof import('react')).useState(
    initial ?? {}
  );
  return (
    <div>
      <AcordoEditor value={value} onChange={setValue} />
      <pre data-testid="state">{JSON.stringify(value)}</pre>
    </div>
  );
}

describe('AcordoEditor', () => {
  it('edits tema, sabor and notas', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText(/^tema$/i), 'Safari');
    await user.type(screen.getByLabelText(/^sabor$/i), 'Ninho');
    await user.type(screen.getByLabelText(/^notas$/i), 'sem lactose');
    const state = JSON.parse(screen.getByTestId('state').textContent!);
    expect(state.tema).toBe('Safari');
    expect(state.sabor).toBe('Ninho');
    expect(state.notas).toBe('sem lactose');
  });

  it('updates reference images through onChange', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByTestId('add-ref-image'));
    const state = JSON.parse(screen.getByTestId('state').textContent!);
    expect(state.imagensReferencia).toHaveLength(1);
    expect(state.imagensReferencia[0].storagePath).toBe('images/a.jpg');
  });

  it('renders existing values', () => {
    render(<Harness initial={{ tema: 'Circo', sabor: 'Cenoura', notas: 'x' }} />);
    expect(screen.getByLabelText(/^tema$/i)).toHaveValue('Circo');
    expect(screen.getByLabelText(/^sabor$/i)).toHaveValue('Cenoura');
  });
});
