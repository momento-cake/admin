/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const isAdminMock = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ isPlatformAdmin: () => isAdminMock() }),
}));

let onSnapshotCallback: ((snap: any) => void) | null = null;
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  onSnapshot: vi.fn((_ref: unknown, cb: (snap: any) => void) => {
    onSnapshotCallback = cb;
    return () => {
      onSnapshotCallback = null;
    };
  }),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { SyncClientsCard } from '@/components/whatsapp/SyncClientsCard';

beforeEach(() => {
  isAdminMock.mockReset();
  fetchMock.mockReset();
  onSnapshotCallback = null;
});

describe('SyncClientsCard', () => {
  it('renders nothing for non-admin users', () => {
    isAdminMock.mockReturnValue(false);
    const { container } = render(<SyncClientsCard />);
    expect(container.firstChild).toBeNull();
  });

  it('renders for admins with the trigger button', () => {
    isAdminMock.mockReturnValue(true);
    render(<SyncClientsCard />);
    expect(screen.getByTestId('sync-clients-card')).toBeInTheDocument();
    expect(screen.getByTestId('sync-clients-button')).toBeInTheDocument();
  });

  it('calls the API on click and shows the running status from the live job', async () => {
    isAdminMock.mockReturnValue(true);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { jobId: 'job-1', phoneCount: 4 } }),
    });

    render(<SyncClientsCard />);

    await userEvent.click(screen.getByTestId('sync-clients-button'));
    expect(fetchMock).toHaveBeenCalledWith('/api/whatsapp/sync-clients', { method: 'POST' });

    // Worker emits a 'running' status update.
    await waitFor(() => expect(onSnapshotCallback).not.toBeNull());
    onSnapshotCallback?.({
      exists: () => true,
      data: () => ({ status: 'running', phones: ['x', 'y', 'z', 'w'] }),
    });

    await waitFor(() => {
      expect(screen.getByTestId('sync-clients-status').textContent).toMatch(/verificando/i);
    });
  });

  it('shows aggregate counts when the job completes', async () => {
    isAdminMock.mockReturnValue(true);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { jobId: 'job-2', phoneCount: 2 } }),
    });

    render(<SyncClientsCard />);
    await userEvent.click(screen.getByTestId('sync-clients-button'));

    await waitFor(() => expect(onSnapshotCallback).not.toBeNull());
    onSnapshotCallback?.({
      exists: () => true,
      data: () => ({ status: 'complete', matched: 12, created: 8, skipped: 4 }),
    });

    await waitFor(() => {
      expect(screen.getByTestId('sync-clients-status').textContent).toMatch(/12 contatos/i);
      expect(screen.getByTestId('sync-clients-status').textContent).toMatch(/8 novos/i);
    });
  });

  it('surfaces a failed job error message', async () => {
    isAdminMock.mockReturnValue(true);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { jobId: 'job-3', phoneCount: 0 } }),
    });

    render(<SyncClientsCard />);
    await userEvent.click(screen.getByTestId('sync-clients-button'));
    await waitFor(() => expect(onSnapshotCallback).not.toBeNull());
    onSnapshotCallback?.({
      exists: () => true,
      data: () => ({ status: 'failed', error: 'whatsapp socket offline' }),
    });

    await waitFor(() => {
      expect(screen.getByTestId('sync-clients-status').textContent).toMatch(/socket offline/i);
    });
  });

  it('surfaces an API error when the POST fails', async () => {
    isAdminMock.mockReturnValue(true);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: 'forbidden' }),
    });

    render(<SyncClientsCard />);
    await userEvent.click(screen.getByTestId('sync-clients-button'));

    await waitFor(() => {
      expect(screen.getByTestId('sync-clients-error').textContent).toMatch(/forbidden/i);
    });
  });
});
