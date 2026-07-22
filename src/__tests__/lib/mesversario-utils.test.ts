import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  computeMesversarioDates,
  getMesLabel,
  daysUntil,
  buildMeses,
  getMesversarioProgress,
  getNextDueMes,
  getMesStatusLabel,
  getMesStatusColor,
} from '@/lib/mesversario-utils';
import type { Mesversario, MesversarioMes } from '@/types/mesversario';

describe('mesversario-utils', () => {
  describe('computeMesversarioDates', () => {
    it('returns exactly 12 dates', () => {
      const dates = computeMesversarioDates('2025-01-15');
      expect(dates).toHaveLength(12);
    });

    it('adds 1..12 months to the birth date', () => {
      const dates = computeMesversarioDates('2025-01-15');
      expect(dates[0]).toBe('2025-02-15'); // 1º mês
      expect(dates[1]).toBe('2025-03-15'); // 2º mês
      expect(dates[11]).toBe('2026-01-15'); // 12º = 1 ano
    });

    it('rolls the year over correctly', () => {
      const dates = computeMesversarioDates('2025-06-10');
      expect(dates[5]).toBe('2025-12-10'); // 6º mês
      expect(dates[6]).toBe('2026-01-10'); // 7º mês
    });

    it('clamps the day-of-month for a Jan-31 baby (Feb has no 31st)', () => {
      const dates = computeMesversarioDates('2025-01-31');
      // Jan 31 + 1 month clamps to Feb 28 (2025 not a leap year)
      expect(dates[0]).toBe('2025-02-28');
      // Jan 31 + 2 months = Mar 31
      expect(dates[1]).toBe('2025-03-31');
      // Jan 31 + 3 months = Apr 30
      expect(dates[2]).toBe('2025-04-30');
    });

    it('clamps to Feb 29 on a leap year', () => {
      const dates = computeMesversarioDates('2024-01-31');
      expect(dates[0]).toBe('2024-02-29');
    });

    it('does not shift the day due to timezone (birth day preserved)', () => {
      const dates = computeMesversarioDates('2025-03-01');
      expect(dates[0]).toBe('2025-04-01');
      expect(dates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true);
    });
  });

  describe('getMesLabel', () => {
    it('labels months 1..11 with the ordinal', () => {
      expect(getMesLabel(1)).toBe('1º mês');
      expect(getMesLabel(2)).toBe('2º mês');
      expect(getMesLabel(11)).toBe('11º mês');
    });

    it('labels month 12 as "1 ano" with a party emoji', () => {
      expect(getMesLabel(12)).toBe('1 ano 🎉');
    });
  });

  describe('daysUntil', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Fix "today" to 2025-06-15 local time.
      vi.setSystemTime(new Date(2025, 5, 15, 10, 30, 0));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns 0 for today', () => {
      expect(daysUntil('2025-06-15')).toBe(0);
    });

    it('returns a positive whole number for future dates', () => {
      expect(daysUntil('2025-06-20')).toBe(5);
    });

    it('returns a negative number for past dates (not annual rollover)', () => {
      expect(daysUntil('2025-06-10')).toBe(-5);
      // A date almost a year in the past must stay negative, unlike an
      // annual-birthday calculation which would roll it forward.
      expect(daysUntil('2024-07-01')).toBeLessThan(0);
    });
  });

  describe('buildMeses', () => {
    it('creates 12 PENDENTE months numbered 1..12', () => {
      const meses = buildMeses('2025-01-15');
      expect(meses).toHaveLength(12);
      expect(meses[0].numero).toBe(1);
      expect(meses[11].numero).toBe(12);
      expect(meses.every((m) => m.status === 'PENDENTE')).toBe(true);
      expect(meses[0].dataComemoracao).toBe('2025-02-15');
    });
  });

  describe('getMesversarioProgress', () => {
    const baseMes = (numero: number, status: MesversarioMes['status']): MesversarioMes => ({
      numero,
      dataComemoracao: '2025-01-01',
      status,
    });

    it('counts ENTREGUE and PEDIDO_CRIADO as done, out of 12', () => {
      const m = {
        meses: [
          baseMes(1, 'ENTREGUE'),
          baseMes(2, 'PEDIDO_CRIADO'),
          baseMes(3, 'ACORDADO'),
          baseMes(4, 'PENDENTE'),
        ],
      } as Mesversario;
      expect(getMesversarioProgress(m)).toEqual({ done: 2, total: 12 });
    });

    it('returns 0 done when nothing is in progress', () => {
      const m = { meses: [baseMes(1, 'PENDENTE')] } as Mesversario;
      expect(getMesversarioProgress(m)).toEqual({ done: 0, total: 12 });
    });
  });

  describe('getNextDueMes', () => {
    // ISO date offset from today by a number of whole days (local calendar).
    const isoOffset = (days: number): string => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + days);
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${y}-${mo}-${da}`;
    };
    const mes = (
      numero: number,
      status: MesversarioMes['status'],
      offsetDays: number
    ): MesversarioMes => ({ numero, dataComemoracao: isoOffset(offsetDays), status });

    it('returns the nearest upcoming pending month', () => {
      const m = {
        meses: [
          mes(1, 'ENTREGUE', -60),
          mes(2, 'PENDENTE', -30),
          mes(3, 'PENDENTE', 5),
          mes(4, 'PENDENTE', 35),
        ],
      } as Mesversario;
      // Month 2 is pending but already past; the next celebration ahead is 3.
      expect(getNextDueMes(m)?.numero).toBe(3);
    });

    it('skips delivered/skipped months when choosing the upcoming one', () => {
      const m = {
        meses: [
          mes(1, 'PULADO', 2),
          mes(2, 'ENTREGUE', 10),
          mes(3, 'PENDENTE', 20),
        ],
      } as Mesversario;
      expect(getNextDueMes(m)?.numero).toBe(3);
    });

    it('does not surface a long-past month when a later one is upcoming (mid-journey baby)', () => {
      // Baby registered ~6 months in: months 1-6 already passed, 7 is days away.
      const meses: MesversarioMes[] = [];
      for (let n = 1; n <= 12; n++) {
        // month n celebration ≈ (n - 7) months from today → 7 is ~3 days out
        meses.push(mes(n, 'PENDENTE', (n - 7) * 30 + 3));
      }
      const m = { meses } as Mesversario;
      expect(getNextDueMes(m)?.numero).toBe(7);
    });

    it('falls back to the most recent past month when nothing is upcoming', () => {
      const m = {
        meses: [
          mes(1, 'ENTREGUE', -90),
          mes(2, 'PENDENTE', -60),
          mes(3, 'PENDENTE', -10),
        ],
      } as Mesversario;
      // No upcoming pending month; the closest-to-today past one is 3.
      expect(getNextDueMes(m)?.numero).toBe(3);
    });

    it('returns null when all months are done or skipped', () => {
      const m = {
        meses: [mes(1, 'ENTREGUE', -30), mes(2, 'PULADO', 10)],
      } as Mesversario;
      expect(getNextDueMes(m)).toBeNull();
    });
  });

  describe('status label / color helpers', () => {
    it('returns a pt-BR label for each status', () => {
      expect(getMesStatusLabel('PENDENTE')).toBe('Pendente');
      expect(getMesStatusLabel('PEDIDO_CRIADO')).toBe('Pedido criado');
    });

    it('returns a non-empty class string for each status', () => {
      expect(getMesStatusColor('ENTREGUE')).toBeTruthy();
      expect(typeof getMesStatusColor('PENDENTE')).toBe('string');
    });
  });
});
