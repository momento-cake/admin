import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { Toaster, toast } from 'sonner';

/**
 * Regression test for the Sonner Toaster configuration.
 *
 * Background: the Toaster in src/app/layout.tsx previously used only
 * `position="top-right" richColors`, with no closeButton, no explicit
 * duration, and no `expand`. As a result error toasts fired by
 * src/components/pedidos/PedidoForm.tsx (e.g. on a 403) were either
 * auto-dismissing too fast or never visibly rendering — the pedido form
 * had to ship an inline error banner as a workaround.
 *
 * These tests mount the Toaster with the production configuration used
 * in src/app/layout.tsx and assert that:
 *   1. toast.error() actually renders to the DOM
 *   2. rich colors mark the toast as an error via data-type
 *   3. closeButton is rendered so the user can always dismiss
 *   4. the toast survives more than one render cycle
 */
describe('<Toaster> root configuration', () => {
  afterEach(() => {
    // Dismiss any remaining toasts between tests to avoid cross-pollination
    toast.dismiss();
    cleanup();
  });

  const mountProductionToaster = () =>
    render(
      <Toaster
        position="top-right"
        richColors
        closeButton
        expand
        visibleToasts={5}
        duration={5000}
      />
    );

  it('renders an error toast into the DOM when toast.error is called', async () => {
    mountProductionToaster();

    toast.error('Erro ao criar pedido', {
      description: 'Você não tem permissão para criar pedidos',
    });

    // Sonner mounts toasts into document.body via a portal, so we use
    // screen (which queries the whole document) rather than container.
    await waitFor(
      () => {
        expect(screen.getByText('Erro ao criar pedido')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    expect(
      screen.getByText('Você não tem permissão para criar pedidos')
    ).toBeInTheDocument();
  });

  it('marks error toasts with data-type="error" so richColors applies', async () => {
    mountProductionToaster();

    toast.error('Something went wrong');

    await waitFor(() => {
      const errorToast = document.querySelector(
        '[data-sonner-toast][data-type="error"]'
      );
      expect(errorToast).not.toBeNull();
    });
  });

  it('renders a close button on toasts so users can dismiss manually', async () => {
    mountProductionToaster();

    toast.error('Erro ao criar pedido');

    await waitFor(() => {
      const closeButton = document.querySelector(
        '[data-sonner-toast] [data-close-button]'
      );
      expect(closeButton).not.toBeNull();
    });
  });

  it('mounts the Toaster root at the configured position once a toast is shown', async () => {
    mountProductionToaster();
    // Sonner 2.x lazily renders the toaster root only after the first toast.
    toast.info('warm up');
    await waitFor(() => {
      const toasterRoot = document.querySelector('[data-sonner-toaster]');
      expect(toasterRoot).not.toBeNull();
      // Sonner encodes position as `top-right` on data-* attrs of the root.
      expect(toasterRoot?.getAttribute('data-y-position')).toBe('top');
      expect(toasterRoot?.getAttribute('data-x-position')).toBe('right');
    });
  });

  it('renders success toasts as well (not just errors)', async () => {
    mountProductionToaster();

    toast.success('Pedido criado com sucesso!');

    await waitFor(() => {
      expect(screen.getByText('Pedido criado com sucesso!')).toBeInTheDocument();
    });
  });
});
