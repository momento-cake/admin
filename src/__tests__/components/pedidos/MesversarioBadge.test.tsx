/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href, onClick }: any) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

import { MesversarioBadge } from '@/components/pedidos/MesversarioBadge';

describe('MesversarioBadge', () => {
  it('links to the milestone journey and shows the month label', () => {
    render(<MesversarioBadge mesversarioId="m1" mesNumero={3} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/orders/mesversarios/m1');
    expect(link).toHaveTextContent('Mesversário');
    expect(link).toHaveTextContent('3º mês');
  });

  it('shows the "1 ano" label for month 12', () => {
    render(<MesversarioBadge mesversarioId="m1" mesNumero={12} />);
    expect(screen.getByRole('link')).toHaveTextContent('1 ano');
  });

  it('omits the month suffix when mesNumero is absent', () => {
    render(<MesversarioBadge mesversarioId="m1" />);
    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('Mesversário');
    expect(link.textContent).not.toContain('·');
  });
});
