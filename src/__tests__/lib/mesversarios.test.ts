import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchMesversarios,
  fetchMesversarioById,
  createMesversario,
  softDeleteMesversario,
  updateMes,
  linkPedidoToMes,
  fetchMesversariosDashboard,
} from '@/lib/mesversarios';
import * as FirebaseFirestore from 'firebase/firestore';

vi.mock('firebase/firestore');
vi.mock('@/lib/firebase', () => ({ db: {} }));

const TS = { toDate: () => new Date('2025-06-15T00:00:00') };

function mesversarioDoc(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    exists: () => true,
    data: () => ({
      clienteId: 'c1',
      clienteNome: 'Maria',
      clienteTelefone: '119',
      relatedPersonId: 'rp1',
      bebeNome: 'João',
      dataNascimento: '2025-01-15',
      status: 'ATIVO',
      meses: [
        { numero: 1, dataComemoracao: '2025-02-15', status: 'ENTREGUE' },
        { numero: 2, dataComemoracao: '2025-03-15', status: 'PENDENTE' },
      ],
      isActive: true,
      createdAt: TS,
      updatedAt: TS,
      createdBy: 'u1',
      lastModifiedBy: 'u1',
      ...overrides,
    }),
  };
}

describe('mesversarios service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Firestore query builders just need to be callable and chainable.
    vi.mocked(FirebaseFirestore.collection).mockReturnValue({} as any);
    vi.mocked(FirebaseFirestore.query).mockReturnValue({} as any);
    vi.mocked(FirebaseFirestore.where).mockReturnValue({} as any);
    vi.mocked(FirebaseFirestore.orderBy).mockReturnValue({} as any);
    vi.mocked(FirebaseFirestore.doc).mockReturnValue({ id: 'new-id' } as any);
    vi.mocked(FirebaseFirestore.Timestamp).now = vi.fn(() => TS as any) as any;
  });

  describe('fetchMesversarios', () => {
    it('returns active mesversarios mapped from the snapshot', async () => {
      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue({
        docs: [mesversarioDoc('m1'), mesversarioDoc('m2')],
      } as any);

      const result = await fetchMesversarios();
      expect(result.mesversarios).toHaveLength(2);
      expect(result.mesversarios[0].id).toBe('m1');
      expect(result.mesversarios[0].bebeNome).toBe('João');
      expect(result.total).toBe(2);
      expect(FirebaseFirestore.where).toHaveBeenCalledWith('isActive', '==', true);
    });

    it('adds a status filter when provided', async () => {
      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue({ docs: [] } as any);
      await fetchMesversarios({ status: 'CONCLUIDO' });
      expect(FirebaseFirestore.where).toHaveBeenCalledWith('status', '==', 'CONCLUIDO');
    });
  });

  it('maps a doc with missing optional fields (no phone/observacoes)', async () => {
    const doc = {
      id: 'm3',
      exists: () => true,
      data: () => ({
        clienteId: 'c1',
        clienteNome: 'Maria',
        relatedPersonId: 'rp1',
        bebeNome: 'João',
        dataNascimento: '2025-01-15',
        status: 'ATIVO',
        // meses omitted -> defaults to []
        isActive: true,
        createdAt: TS,
        updatedAt: TS,
        createdBy: 'u1',
        lastModifiedBy: 'u1',
      }),
    };
    vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(doc as any);
    const m = await fetchMesversarioById('m3');
    expect(m.clienteTelefone).toBeUndefined();
    expect(m.observacoes).toBeUndefined();
    expect(m.meses).toEqual([]);
  });

  it('rethrows when the underlying query fails', async () => {
    vi.mocked(FirebaseFirestore.getDocs).mockRejectedValue(new Error('firestore down'));
    await expect(fetchMesversarios()).rejects.toThrow('firestore down');
  });

  it('rethrows when updateMes fails to persist', async () => {
    vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(mesversarioDoc('m1') as any);
    vi.mocked(FirebaseFirestore.updateDoc).mockRejectedValue(new Error('write failed'));
    await expect(updateMes('m1', 2, { status: 'EM_CONTATO' })).rejects.toThrow('write failed');
  });

  it('patches observacoes and merges acordo fields', async () => {
    vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(
      mesversarioDoc('m1', {
        meses: [
          {
            numero: 1,
            dataComemoracao: '2025-02-15',
            status: 'ACORDADO',
            acordo: { tema: 'Antigo', sabor: 'Baunilha' },
          },
        ],
      }) as any
    );
    vi.mocked(FirebaseFirestore.updateDoc).mockResolvedValue(undefined as any);

    await updateMes('m1', 1, { observacoes: 'ligar amanhã', acordo: { tema: 'Novo' } });

    const payload = vi.mocked(FirebaseFirestore.updateDoc).mock.calls[0][1] as any;
    const mes1 = payload.meses.find((m: any) => m.numero === 1);
    expect(mes1.observacoes).toBe('ligar amanhã');
    expect(mes1.acordo.tema).toBe('Novo'); // overwritten
    expect(mes1.acordo.sabor).toBe('Baunilha'); // preserved via shallow merge
  });

  describe('fetchMesversarioById', () => {
    it('returns a single mesversario', async () => {
      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(mesversarioDoc('m1') as any);
      const m = await fetchMesversarioById('m1');
      expect(m.id).toBe('m1');
      expect(m.meses).toHaveLength(2);
    });

    it('throws when not found', async () => {
      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue({ exists: () => false } as any);
      await expect(fetchMesversarioById('nope')).rejects.toThrow();
    });
  });

  describe('createMesversario', () => {
    it('generates 12 meses and stamps audit fields', async () => {
      vi.mocked(FirebaseFirestore.addDoc).mockResolvedValue({ id: 'created-1' } as any);
      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(mesversarioDoc('created-1') as any);

      await createMesversario(
        {
          clienteId: 'c1',
          clienteNome: 'Maria',
          clienteTelefone: '119',
          relatedPersonId: 'rp1',
          bebeNome: 'João',
          dataNascimento: '2025-01-15',
        },
        'user-1'
      );

      expect(FirebaseFirestore.addDoc).toHaveBeenCalled();
      const payload = vi.mocked(FirebaseFirestore.addDoc).mock.calls[0][1] as any;
      expect(payload.meses).toHaveLength(12);
      expect(payload.meses[0].status).toBe('PENDENTE');
      expect(payload.status).toBe('ATIVO');
      expect(payload.isActive).toBe(true);
      expect(payload.createdBy).toBe('user-1');
      expect(payload.lastModifiedBy).toBe('user-1');
    });
  });

  describe('softDeleteMesversario', () => {
    it('sets isActive false', async () => {
      vi.mocked(FirebaseFirestore.updateDoc).mockResolvedValue(undefined as any);
      await softDeleteMesversario('m1');
      const payload = vi.mocked(FirebaseFirestore.updateDoc).mock.calls[0][1] as any;
      expect(payload.isActive).toBe(false);
    });
  });

  describe('updateMes', () => {
    it('patches the targeted month and leaves others intact', async () => {
      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(mesversarioDoc('m1') as any);
      vi.mocked(FirebaseFirestore.updateDoc).mockResolvedValue(undefined as any);

      await updateMes('m1', 2, { status: 'EM_CONTATO' });

      const payload = vi.mocked(FirebaseFirestore.updateDoc).mock.calls[0][1] as any;
      const mes2 = payload.meses.find((m: any) => m.numero === 2);
      const mes1 = payload.meses.find((m: any) => m.numero === 1);
      expect(mes2.status).toBe('EM_CONTATO');
      expect(mes1.status).toBe('ENTREGUE'); // untouched
    });
  });

  describe('linkPedidoToMes', () => {
    it('stores the order and moves the month to PEDIDO_CRIADO', async () => {
      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(mesversarioDoc('m1') as any);
      vi.mocked(FirebaseFirestore.updateDoc).mockResolvedValue(undefined as any);

      await linkPedidoToMes('m1', 2, 'ped-1', 'PED-0001');

      const payload = vi.mocked(FirebaseFirestore.updateDoc).mock.calls[0][1] as any;
      const mes2 = payload.meses.find((m: any) => m.numero === 2);
      expect(mes2.pedidoId).toBe('ped-1');
      expect(mes2.pedidoNumero).toBe('PED-0001');
      expect(mes2.status).toBe('PEDIDO_CRIADO');
    });
  });

  describe('fetchMesversariosDashboard', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 5, 15, 9, 0, 0)); // 2025-06-15
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('flattens each active baby to its next-due month sorted by daysUntil', async () => {
      const near = mesversarioDoc('m-near', {
        bebeNome: 'Perto',
        meses: [
          { numero: 1, dataComemoracao: '2025-06-20', status: 'PENDENTE' },
          { numero: 2, dataComemoracao: '2025-07-20', status: 'PENDENTE' },
        ],
      });
      const far = mesversarioDoc('m-far', {
        bebeNome: 'Longe',
        meses: [
          { numero: 1, dataComemoracao: '2025-06-25', status: 'PENDENTE' },
        ],
      });
      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue({ docs: [far, near] } as any);

      const entries = await fetchMesversariosDashboard();
      expect(entries).toHaveLength(2);
      // Sorted by daysUntil ascending: near (Jun 20) before far (Jun 25)
      expect(entries[0].bebeNome).toBe('Perto');
      expect(entries[0].numero).toBe(1);
      expect(entries[0].daysUntil).toBe(5);
      expect(entries[0].relativeLabel).toContain('5');
      expect(entries[1].bebeNome).toBe('Longe');
    });

    it('omits babies whose journey is fully settled', async () => {
      const done = mesversarioDoc('m-done', {
        meses: [{ numero: 1, dataComemoracao: '2025-02-15', status: 'ENTREGUE' }],
      });
      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue({ docs: [done] } as any);
      const entries = await fetchMesversariosDashboard();
      expect(entries).toHaveLength(0);
    });
  });
});
