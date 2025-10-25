import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/invitations/route';
import { GET as GET_BY_ID } from '@/app/api/invitations/[id]/route';
import * as fb from 'firebase/firestore';
import * as invitationsLib from '@/lib/invitations';
import { NextRequest } from 'next/server';
import { mockInvitations, factories } from '../mocks/data';

// Mock dependencies
vi.mock('firebase/firestore');
vi.mock('@/lib/firebase', () => ({
  db: {}
}));
vi.mock('@/lib/invitations');

describe('Invitations API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/invitations', () => {
    it('should fetch all invitations successfully', async () => {
      const collectionMock = vi.fn();
      const queryMock = vi.fn();
      const getDocsMock = vi.fn();

      vi.mocked(fb.collection).mockImplementation(collectionMock as any);
      vi.mocked(fb.query).mockImplementation(queryMock as any);
      vi.mocked(fb.getDocs).mockResolvedValue({
        forEach: (callback: any) => {
          mockInvitations.forEach(inv => {
            callback({
              id: inv.id,
              data: () => ({
                email: inv.email,
                name: inv.name,
                role: inv.role,
                status: inv.status,
                token: inv.token,
                invitedBy: inv.invitedBy,
                invitedAt: { toDate: () => inv.invitedAt },
                expiresAt: { toDate: () => inv.expiresAt },
                acceptedAt: inv.acceptedAt ? { toDate: () => inv.acceptedAt } : null,
                cancelledAt: inv.cancelledAt ? { toDate: () => inv.cancelledAt } : null,
                metadata: inv.metadata
              })
            } as any);
          });
        }
      } as any);

      const request = new NextRequest('http://localhost:3001/api/invitations');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invitations).toBeDefined();
      expect(data.count).toBe(mockInvitations.length);
    });

    it('should handle empty invitations list', async () => {
      vi.mocked(fb.collection).mockReturnValue({} as any);
      vi.mocked(fb.query).mockReturnValue({} as any);
      vi.mocked(fb.getDocs).mockResolvedValue({
        forEach: () => {}
      } as any);

      const request = new NextRequest('http://localhost:3001/api/invitations');
      const response = await GET();
      const data = await response.json();

      expect(data.count).toBe(0);
      expect(data.invitations).toEqual([]);
    });

    it('should handle permission denied error gracefully', async () => {
      vi.mocked(fb.collection).mockReturnValue({} as any);
      vi.mocked(fb.query).mockReturnValue({} as any);
      vi.mocked(fb.getDocs).mockRejectedValue({
        code: 'permission-denied',
        message: 'Missing or insufficient permissions'
      });

      const request = new NextRequest('http://localhost:3001/api/invitations');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invitations).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('should handle not found error gracefully', async () => {
      vi.mocked(fb.collection).mockReturnValue({} as any);
      vi.mocked(fb.query).mockReturnValue({} as any);
      vi.mocked(fb.getDocs).mockRejectedValue({
        code: 'not-found',
        message: 'Collection does not exist'
      });

      const request = new NextRequest('http://localhost:3001/api/invitations');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invitations).toEqual([]);
    });

    it('should return 500 for other errors', async () => {
      vi.mocked(fb.collection).mockReturnValue({} as any);
      vi.mocked(fb.query).mockReturnValue({} as any);
      vi.mocked(fb.getDocs).mockRejectedValue({
        code: 'unknown',
        message: 'Unknown error'
      });

      const request = new NextRequest('http://localhost:3001/api/invitations');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/invitations', () => {
    it('should create invitation with valid data', async () => {
      vi.mocked(fb.collection).mockReturnValue({} as any);
      vi.mocked(fb.query).mockReturnValue({} as any);
      vi.mocked(fb.getDocs).mockResolvedValue({ empty: true } as any);
      vi.mocked(fb.addDoc).mockResolvedValue({ id: 'inv1' } as any);
      vi.mocked(fb.serverTimestamp).mockReturnValue({} as any);
      vi.mocked(invitationsLib.generateInvitationToken).mockReturnValue('token123');
      vi.mocked(invitationsLib.sendInvitationEmail).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3001/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          name: 'New User',
          role: 'admin',
          invitedBy: 'admin@test.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.invitation).toBeDefined();
      expect(data.invitation.email).toBe('newuser@example.com');
      expect(data.message).toContain('successfully');
    });

    it('should require email field', async () => {
      const request = new NextRequest('http://localhost:3001/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          role: 'admin',
          invitedBy: 'admin@test.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should require name field', async () => {
      const request = new NextRequest('http://localhost:3001/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          role: 'admin',
          invitedBy: 'admin@test.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should require role field', async () => {
      const request = new NextRequest('http://localhost:3001/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          invitedBy: 'admin@test.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should require invitedBy field', async () => {
      const request = new NextRequest('http://localhost:3001/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should validate email format', async () => {
      const request = new NextRequest('http://localhost:3001/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          name: 'Test User',
          role: 'admin',
          invitedBy: 'admin@test.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid email format');
    });

    it('should validate role value', async () => {
      const request = new NextRequest('http://localhost:3001/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          role: 'superadmin',
          invitedBy: 'admin@test.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid role');
    });

    it('should accept admin role', async () => {
      vi.mocked(fb.collection).mockReturnValue({} as any);
      vi.mocked(fb.query).mockReturnValue({} as any);
      vi.mocked(fb.getDocs).mockResolvedValue({ empty: true } as any);
      vi.mocked(fb.addDoc).mockResolvedValue({ id: 'inv1' } as any);
      vi.mocked(invitationsLib.generateInvitationToken).mockReturnValue('token123');
      vi.mocked(invitationsLib.sendInvitationEmail).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3001/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          invitedBy: 'admin@test.com'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('should accept viewer role', async () => {
      vi.mocked(fb.collection).mockReturnValue({} as any);
      vi.mocked(fb.query).mockReturnValue({} as any);
      vi.mocked(fb.getDocs).mockResolvedValue({ empty: true } as any);
      vi.mocked(fb.addDoc).mockResolvedValue({ id: 'inv1' } as any);
      vi.mocked(invitationsLib.generateInvitationToken).mockReturnValue('token123');
      vi.mocked(invitationsLib.sendInvitationEmail).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3001/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          role: 'viewer',
          invitedBy: 'admin@test.com'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('should prevent duplicate pending invitations', async () => {
      vi.mocked(fb.collection).mockReturnValue({} as any);
      vi.mocked(fb.query).mockReturnValue({} as any);
      vi.mocked(fb.getDocs).mockResolvedValue({
        empty: false
      } as any);

      const request = new NextRequest('http://localhost:3001/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          invitedBy: 'admin@test.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already exists');
    });

    it('should convert email to lowercase', async () => {
      vi.mocked(fb.collection).mockReturnValue({} as any);
      vi.mocked(fb.query).mockReturnValue({} as any);
      vi.mocked(fb.getDocs).mockResolvedValue({ empty: true } as any);
      vi.mocked(fb.addDoc).mockResolvedValue({ id: 'inv1' } as any);
      vi.mocked(invitationsLib.generateInvitationToken).mockReturnValue('token123');
      vi.mocked(invitationsLib.sendInvitationEmail).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3001/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'Test@Example.COM',
          name: 'Test User',
          role: 'admin',
          invitedBy: 'admin@test.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.invitation.email).toBe('test@example.com');
    });

    it('should set expiration to 7 days', async () => {
      vi.mocked(fb.collection).mockReturnValue({} as any);
      vi.mocked(fb.query).mockReturnValue({} as any);
      vi.mocked(fb.getDocs).mockResolvedValue({ empty: true } as any);
      vi.mocked(fb.addDoc).mockResolvedValue({ id: 'inv1' } as any);
      vi.mocked(invitationsLib.generateInvitationToken).mockReturnValue('token123');
      vi.mocked(invitationsLib.sendInvitationEmail).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3001/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          invitedBy: 'admin@test.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      const expiresAt = new Date(data.invitation.expiresAt);
      const now = new Date();
      const diffInDays = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Should be 6-7 days (accounting for time variance)
      expect(diffInDays).toBeGreaterThanOrEqual(6);
      expect(diffInDays).toBeLessThanOrEqual(7);
    });

    it('should continue on email send failure', async () => {
      vi.mocked(fb.collection).mockReturnValue({} as any);
      vi.mocked(fb.query).mockReturnValue({} as any);
      vi.mocked(fb.getDocs).mockResolvedValue({ empty: true } as any);
      vi.mocked(fb.addDoc).mockResolvedValue({ id: 'inv1' } as any);
      vi.mocked(invitationsLib.generateInvitationToken).mockReturnValue('token123');
      vi.mocked(invitationsLib.sendInvitationEmail).mockRejectedValue(
        new Error('Email service unavailable')
      );

      const request = new NextRequest('http://localhost:3001/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          invitedBy: 'admin@test.com'
        })
      });

      const response = await POST(request);

      // Should still return 201 even if email fails
      expect(response.status).toBe(201);
    });

    it('should handle server errors', async () => {
      vi.mocked(fb.collection).mockReturnValue({} as any);
      vi.mocked(fb.query).mockReturnValue({} as any);
      vi.mocked(fb.getDocs).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3001/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          invitedBy: 'admin@test.com'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should accept optional metadata', async () => {
      vi.mocked(fb.collection).mockReturnValue({} as any);
      vi.mocked(fb.query).mockReturnValue({} as any);
      vi.mocked(fb.getDocs).mockResolvedValue({ empty: true } as any);
      vi.mocked(fb.addDoc).mockResolvedValue({ id: 'inv1' } as any);
      vi.mocked(invitationsLib.generateInvitationToken).mockReturnValue('token123');
      vi.mocked(invitationsLib.sendInvitationEmail).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3001/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          invitedBy: 'admin@test.com',
          metadata: { tenant: 'tenant123' }
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.invitation.metadata).toBeDefined();
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3001/api/invitations', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
