import { describe, it, expect } from 'vitest';
import {
  ALL_FEATURES,
  FEATURE_METADATA,
  PATH_TO_FEATURE,
  DEFAULT_ATENDENTE_PERMISSIONS,
  DEFAULT_PRODUCAO_PERMISSIONS,
  canAccessFeature,
  canAccessPath,
  canPerformAction,
  getEffectivePermissions,
} from '@/lib/permissions';
import type { UserModel } from '@/types';

const buildUser = (
  type: 'admin' | 'atendente' | 'producao',
  customPermissions?: UserModel['customPermissions']
): UserModel =>
  ({
    uid: 'u1',
    email: 'u1@example.com',
    role: { type },
    isActive: true,
    customPermissions,
  } as unknown as UserModel);

describe('permissions: whatsapp feature registration', () => {
  it('is included in ALL_FEATURES', () => {
    expect(ALL_FEATURES).toContain('whatsapp');
  });

  it('has feature metadata with pt-BR label', () => {
    const meta = FEATURE_METADATA.find((f) => f.key === 'whatsapp');
    expect(meta).toBeDefined();
    expect(meta?.label).toBe('WhatsApp');
    expect(meta?.availableActions).toEqual(['view', 'create', 'update', 'delete']);
  });

  it('maps /whatsapp and /whatsapp/settings paths', () => {
    expect(PATH_TO_FEATURE['/whatsapp']).toBe('whatsapp');
    expect(PATH_TO_FEATURE['/whatsapp/settings']).toBe('whatsapp');
  });
});

describe('permissions: atendente WhatsApp access', () => {
  it('grants atendente view, create, update by default', () => {
    expect(DEFAULT_ATENDENTE_PERMISSIONS.whatsapp).toEqual({
      enabled: true,
      actions: ['view', 'create', 'update'],
    });
  });

  it('does NOT grant atendente delete', () => {
    expect(DEFAULT_ATENDENTE_PERMISSIONS.whatsapp?.actions).not.toContain('delete');
  });

  it('canAccessFeature returns true for atendente on whatsapp', () => {
    const user = buildUser('atendente');
    expect(canAccessFeature(user, 'whatsapp')).toBe(true);
  });

  it('canPerformAction(create) returns true for atendente on whatsapp', () => {
    const user = buildUser('atendente');
    expect(canPerformAction(user, 'whatsapp', 'create')).toBe(true);
  });

  it('canPerformAction(delete) returns false for atendente on whatsapp', () => {
    const user = buildUser('atendente');
    expect(canPerformAction(user, 'whatsapp', 'delete')).toBe(false);
  });

  it('canAccessPath returns true for atendente on /whatsapp', () => {
    const user = buildUser('atendente');
    expect(canAccessPath(user, '/whatsapp')).toBe(true);
  });

  it('canAccessPath returns true for atendente on /whatsapp/settings', () => {
    const user = buildUser('atendente');
    expect(canAccessPath(user, '/whatsapp/settings')).toBe(true);
  });

  it('canAccessPath returns true for nested route /whatsapp/conversa/123', () => {
    const user = buildUser('atendente');
    expect(canAccessPath(user, '/whatsapp/conversa/123')).toBe(true);
  });
});

describe('permissions: producao role denied WhatsApp', () => {
  it('does not include whatsapp in producao defaults', () => {
    expect(DEFAULT_PRODUCAO_PERMISSIONS.whatsapp).toBeUndefined();
  });

  it('canAccessFeature returns false for producao on whatsapp', () => {
    const user = buildUser('producao');
    expect(canAccessFeature(user, 'whatsapp')).toBe(false);
  });

  it('canAccessPath returns false for producao on /whatsapp', () => {
    const user = buildUser('producao');
    expect(canAccessPath(user, '/whatsapp')).toBe(false);
  });
});

describe('permissions: admin always has WhatsApp access', () => {
  it('admin can perform every whatsapp action', () => {
    const user = buildUser('admin');
    for (const action of ['view', 'create', 'update', 'delete'] as const) {
      expect(canPerformAction(user, 'whatsapp', action)).toBe(true);
    }
  });

  it('admin getEffectivePermissions includes whatsapp', () => {
    const user = buildUser('admin');
    const perms = getEffectivePermissions(user);
    expect(perms.whatsapp?.enabled).toBe(true);
    expect(perms.whatsapp?.actions).toEqual(['view', 'create', 'update', 'delete']);
  });
});

describe('permissions: custom override can revoke whatsapp from atendente', () => {
  it('respects customPermissions disabling whatsapp', () => {
    const user = buildUser('atendente', {
      whatsapp: { enabled: false, actions: [] },
    });
    expect(canAccessFeature(user, 'whatsapp')).toBe(false);
  });
});
